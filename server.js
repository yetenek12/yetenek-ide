const { dialog } = require('electron');
const http = require("http")
const express = require('express')
const app = express()
const socketIO = require("socket.io")
const morgan = require('morgan')
const { spawn } = require("child_process");
const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const SerialPort = require('serialport')
const Shell = require('node-powershell')
const { app: electronApp } = require('electron')

// GLOBAL CONSTANTS
global.PROJECT_SETTINGS = '/yetenekide.projectsettings'
global.WORKSPACE_XML = '/workspace'
global.MAIN_CPP = '/src/main.cpp'

// GLOBAL STATE
global.projectLoaded = false
global.projectName = ''
global.projectPath = ''
global.xml = ''
global.code = ''
global.monitor = null

// const ps = new Shell({
//     executionPolicy: 'Bypass',
//     noProfile: true
// });

// ----------------------------------------------------------------------------
// Startup Check (Windows)
// ----------------------------------------------------------------------------
function createSymlink(){
    return new Promise((resolve, reject) => {
        if(process.platform === 'win32'){
            try{
                fs.accessSync("C:\\.platformio")
                console.log("C:\\.platformio exists.")
                resolve()
            }
            catch(err){
                console.log("Creating symlink for C:\\.platformio")
                const cmd = `Start-Process -WindowStyle hidden cmd -Verb RunAs -ArgumentList '/c mklink /d "C:\\.platformio" "${path.join(getAppPath(), '/extra_resources/windows/.platformio')}"'`
                console.log(cmd)
                ps.addCommand(cmd);
                ps.invoke()
                .then(output => {
                    console.log(output);
                    resolve()
                })
                .catch(err => {
                    console.log(err);
                    reject()
                });
            }
        }
        else{
            resolve()
        }
    });
}

// ----------------------------------------------------------------------------
// Utils
// ----------------------------------------------------------------------------

function getAppPath(){
    const appPath = electronApp.getAppPath();
    if(appPath.endsWith('.asar')){
        return path.parse(appPath).dir
    }
    else{
        return appPath
    }
}

function runPIO(socket, cmdArr, onClose, onStart){
    let pioLocation = null
    if(process.platform === 'win32'){
        pioLocation =  path.join(getAppPath(), '/extra_resources/windows/.platformio/penv/Scripts/pio.exe')
    }
    else if(process.platform === 'darwin'){
        pioLocation =  path.join(getAppPath(), '/extra_resources/mac/.platformio/penv/bin/pio')
    }

    const msg = `${pioLocation} ${cmdArr.join(' ')}`
    console.log(msg)
    socket.emit('term', msg)

    const pio = spawn(pioLocation, cmdArr)
    pio.stdout.on('data', data => {
        const msg = data + ''
        console.log(msg)
        socket.emit('term', msg)
    })
    pio.stderr.on('data', data => {
        const msg = data + ''
        console.error(msg)
        socket.emit('term', msg, 'error')
    })
    pio.on('error', (error) => {
        const msg = `error: ${error.message}`
        console.error(msg);
        socket.emit('term', msg)

        if(onClose) onClose(error)
    });
    pio.on('close', code => {
        const msg = `child process exited with code ${code}`
        console.log(msg);
        socket.emit('term', msg, 'close')
        socket.emit('term', '')
        socket.emit('term', '')

        if(onClose) onClose()
    });

    if(onStart) onStart(pio)
}

function runMonitor(socket, port){

    // Kill existing
    killMonitor(socket);

    const msg = '-------- Starting Serial Monitor --------'
    socket.emit('term', msg);
    console.log(msg)

    // -------- SERIAL MONITOR
    const cmd = ['device', 'monitor']
    if(port !== 'auto'){
        cmd.push('--port')
        cmd.push(port)
    }

    // --------
    runPIO(socket, cmd, 
    (err) => {
        console.error('CLOSE ', err);
    },
    (proc) => {
        global.monitor = proc
    })
}

function killMonitor(socket){
    if(global.monitor){
        const msg = '-------- Closing Serial Monitor --------'
        socket.emit('term', msg);
        console.log(msg + " (SIGINT)")

        global.monitor.kill('SIGINT');
        global.monitor = null;
    }
}

// ----------------------------------------------------------------------------
// Body Parser
// ----------------------------------------------------------------------------

// https://jorge.fbarr.net/2011/04/03/nginx-error-413-request-entity-too-large/
// https://stackoverflow.com/questions/19917401/error-request-entity-too-large
app.use(express.json({limit: '50mb'}))
app.use(express.urlencoded({limit: '50mb', extended: false}))

// ----------------------------------------------------------------------------
// Logging (only if NOT "production")
// ----------------------------------------------------------------------------

if (app.get('env') !== 'production') {
    app.use(morgan('tiny'))
    console.log('Development Logging Active!')
}

// ----------------------------------------------------------------------------
// Serve Static Files
// ----------------------------------------------------------------------------

// app.use('/', express.static(__dirname, {index: 'index.html'}))
app.use('/', express.static(`${__dirname}/src`))
app.use('/blockly', express.static(`${__dirname}/blockly`))
app.use('/vanilla-terminal', express.static(`${__dirname}/vanilla-terminal`))

// ----------------------------------------------------------------------------
// HTTP SERVER
// ----------------------------------------------------------------------------
const httpServer = http.createServer(app);
const io = socketIO(httpServer);

// ----------------------------------------------------------------------------
// SOCKET IO
// ----------------------------------------------------------------------------

io.on("connection", (socket) => {

    // init
    socket.on('init', () => {
        socket.emit('init', {
            projectLoaded: global.projectLoaded,
            projectName: global.projectName,
            projectPath: global.projectPath,
            xml: global.xml,
            code: global.code
        })
    })

    // Create Project Form (update path OR name)
    socket.on('create_form_update', (data) => {
        // console.log(data)
        let formError = null;

        if(data.showDialog){
            const f = dialog.showOpenDialogSync(global.win,{
                properties: ['openDirectory'],
                message: 'Proje Oluştur',
                buttonLabel: 'Seç'
            })
    
            // array of paths OR undefined
            if(f){
                data.projectPath = f[0] + path.sep + 'project-' + Date.now()
                // console.log(f[0])
            }
        }

        let projectName = data.projectName
        projectName = _.trim(projectName)
        projectName = _.deburr(projectName)
        projectName = _.kebabCase(projectName)
        
        if(projectName.length === 0){
            projectName = 'project-' + Date.now()
        }

        // {
        //     root: 'P:\\',
        //     dir: 'P:\\_Emre\\yetenek-ide',
        //     base: 'hello',
        //     ext: '',
        //     name: 'hello'
        // }
        //
        // { 
        //     root: 'C:\\', 
        //     dir: 'C:\\', 
        //     base: '', 
        //     ext: '', 
        //     name: '' 
        // }
        if(!data.projectPath){
            data.projectPath = electronApp.getPath('documents') + path.sep + projectName
        }

        const projectDir = path.parse(data.projectPath).dir
        const projectPath = projectDir + path.sep + projectName

        socket.emit('create_form_update', {
            projectPath
        })
    })

    // Create New Project
    socket.on('create_project', (data) => {

        let err = false
        let projectName = data.projectName
        const projectPath = data.projectPath

        if(projectName.length === 0){
            projectName = 'Yeni Proje'
        }
        
        // https://coderrocketfuel.com/article/check-if-a-directory-exists-in-node-js
        try{
            fs.accessSync(projectPath)
            console.log("Directory exists.")

            socket.emit('create_project', {
                error: 'Bu klasör zaten var.'
            })
            return;
        }
        catch(err){
            console.log("Directory does not exist.")
        }

        // create symlink (Elevate Privileges) (windows)
        createSymlink()
        .then(() => {
            // Create directory
            // https://joshtronic.com/2021/01/17/recursively-create-directories-with-nodejs/
            fs.mkdirSync(projectPath, { recursive: true })

            // Create pio project
            const cmd = ['project', 'init', '--project-dir', projectPath]
            runPIO(socket, cmd, () => {
                // --------------------------------------------------------------------------
                // Configure platformio.ini
                const pioIniPath = path.join(projectPath, '/platformio.ini')
                let pioIni = fs.readFileSync(pioIniPath, 'utf8')
                pioIni += '\n'
                pioIni += '[env:esp-wrover-kit]\n'
                pioIni += 'platform = espressif32\n'
                pioIni += 'board = esp-wrover-kit\n'
                pioIni += 'framework = arduino\n'
                pioIni += '\n'
                fs.writeFileSync(path.join(pioIniPath), pioIni)

                // Create main.cpp
                const maincppPath = path.join(projectPath, global.MAIN_CPP)
                let maincpp = ''
                maincpp += '#include <Arduino.h>\n\n'
                maincpp += 'void setup(){\n\n'
                maincpp += '}\n\n'
                maincpp += 'void loop(){\n\n'
                maincpp += '}\n\n'
                fs.writeFileSync(maincppPath, maincpp)

                // Create Project Settings
                const projectSettings = {}
                projectSettings.projectName = projectName

                const projectSettingsPath = path.join(projectPath, global.PROJECT_SETTINGS)
                const projectSettingsStr = JSON.stringify(projectSettings);
                fs.writeFileSync(projectSettingsPath, projectSettingsStr)

                // Create XML
                const workspaceStr = '<xml xmlns="https://developers.google.com/blockly/xml"><block type="base_start" deletable="false" movable="false"></block></xml>'
                const workspacePath = path.join(projectPath, global.WORKSPACE_XML)
                fs.writeFileSync(workspacePath, workspaceStr)

                // PROJECT CREATED!
                global.projectLoaded = true
                global.projectName = projectName
                global.projectPath = projectPath
                global.xml = workspaceStr
                global.code = maincpp

                socket.emit('create_project', {
                    status: 'ok'
                })
            })
        })
        .catch(() => {
            console.error('Elevation Error!')
            socket.emit('create_project', {
                error: 'İşlem Reddedildi.'
            })
        })
    })

    // Change Project
    socket.on('change_project', () => {

        // create symlink (Elevate Privileges) (windows)
        createSymlink()
        .then(() => {
            const f = dialog.showOpenDialogSync(global.win,{
                properties: ['openDirectory'],
                message: 'Projeyi Aç',
                buttonLabel: 'Aç'
            })
    
            if(f && f[0]){
    
                 // https://coderrocketfuel.com/article/check-if-a-directory-exists-in-node-js
                try{
                    fs.accessSync(f[0])
                    
                    const projectSettingsFilePath = path.join(f[0], global.PROJECT_SETTINGS)
                    const pioIniFilePath = path.join(f[0], '/platformio.ini')
    
                    const validProject = fs.existsSync(projectSettingsFilePath) && fs.existsSync(pioIniFilePath)
                    if(validProject){
                        console.log(`\nLoading Project: ${f[0]}\n`)
    
                        // Read Project Settings
                        let projectSettings = {}
                        try{
                            projectSettings = JSON.parse(fs.readFileSync(projectSettingsFilePath, 'utf8'))
                        }
                        catch(err){
                            socket.emit('change_project', {
                                error: 'Invalid Project File'
                            })
                            return;
                        }
    
                        global.projectLoaded = true
                        global.projectName = projectSettings.projectName + ''
                        global.projectPath = f[0] + path.sep
    
                        // Read XML
                        try{
                            global.xml = fs.readFileSync(path.join(f[0], global.WORKSPACE_XML), 'utf8')
                        }
                        catch(err){
                            socket.emit('change_project', {
                                error: 'Invalid Project File'
                            })
                            return;
                        }
    
                        // Read Code
                        try{
                            global.code = fs.readFileSync(path.join(f[0], global.MAIN_CPP), 'utf8')
                        }
                        catch(err){
                            socket.emit('change_project', {
                                error: 'Invalid Project File'
                            })
                            return;
                        }
    
                        // OK
                        socket.emit('change_project', {
                            status: 'ok'
                        })
                    }
                    else{
                        console.log(`${f[0]} is not a YETENEK IDE Project Folder.`)
                        socket.emit('change_project', {
                            error: `${f[0]} YETENEK IDE Proje Klasörü değil.`
                        })
                    }
                }
                catch(err){
                    console.log("Directory does not exist.")
                }
            }
        })
        .catch(() => {
            console.error('Elevation Error!')
        })
    })

    // Port List
    socket.on('ports', () => {
        // [
        //     {
        //         path: 'COM4',
        //         manufacturer: 'wch.cn',
        //         serialNumber: '5&58ce05&0&2',
        //         pnpId: 'USB\\VID_1A86&PID_7523\\5&58CE05&0&2',
        //         locationId: 'Port_#0002.Hub_#0002',
        //         vendorId: '1A86',
        //         productId: '7523'
        //     }
        // ]
        SerialPort.list()
        .then((ports) => {
            // console.log('SERIAL PORTS:')
            // console.log(ports)
            socket.emit('ports', {
                ports
            })
        })
        .catch((err) => {
            console.error(err)
        })
    })
    
    // Upload Code
    socket.on('upload', (data) => {

        // --------
        if(global.uploading){
            console.log('Upload in progres. Please wait...')
            socket.emit('term', '')
            socket.emit('term', 'Upload in progres. Please wait...')
            socket.emit('term', '')
            return
        }

        // Disable monitor
        killMonitor(socket)

        // --------
        console.log()
        console.log('---------------- UPLOAD ----------------')
        console.log('PORT: ' + data.port)
        console.log()
        console.log(data.code)
        console.log('----------------------------------------')
        console.log()

        // --------
        const cmd = ['run', '--target', 'upload']
        if(data.port !== 'auto'){
            cmd.push('--upload-port')
            cmd.push(data.port)
        }
        cmd.push('--project-dir')
        cmd.push(global.projectPath)

        // --------
        global.uploading = true
        runPIO(socket, cmd, () => {
            global.uploading = false
            runMonitor(socket, data.port);
        })
    })

    // Save Project
    socket.on('save', (data) => {
        console.log('Saving Project...')

        // Save main.cpp
        const maincppPath = path.join(projectPath, global.MAIN_CPP)
        fs.writeFileSync(maincppPath, data.code)

        // Save XML
        const workspacePath = path.join(projectPath, global.WORKSPACE_XML)
        fs.writeFileSync(workspacePath, data.xml)
    })

    // Serial Status
    socket.on('serial_status', (data) => {
        if(data.enable){
            runMonitor(socket, data.port);
        }
        else{
            killMonitor(socket);
        }
    })
});

// ----------------------------------------------------------------------------
// Start the Server
// ----------------------------------------------------------------------------
httpServer.listen(8000, 'localhost', () => console.log('HTTP Server started on 8000.'));