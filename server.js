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
const { app: electronApp } = require('electron')

// GLOBAL CONSTANTS
global.PROJECT_SETTINGS = '/yetenekide.projectsettings'

// GLOBAL STATE
global.projectLoaded = false
global.projectName = ''
global.projectPath = ''

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
            projectPath: global.projectPath
        })
    })

    // Create Project Form (update path OR name)
    socket.on('create_form_update', (data) => {
        // console.log(data)
        let formError = null;

        if(data.showDialog){
            const f = dialog.showOpenDialogSync(global.win,{
                properties: ['openDirectory'],
                message: 'Create Project',
                buttonLabel: 'Select'
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
            projectName = 'New Project'
        }
        
        // https://coderrocketfuel.com/article/check-if-a-directory-exists-in-node-js
        try{
            fs.accessSync(projectPath)
            console.log("Directory exists.")

            socket.emit('create_project', {
                error: 'Directory exists.'
            })
            return;
        }
        catch(err){
            console.log("Directory does not exist.")
        }

        // Create directory
        // https://joshtronic.com/2021/01/17/recursively-create-directories-with-nodejs/
        fs.mkdirSync(projectPath, { recursive: true })

        // Pio Location
        let pioLocation = null
        if(process.platform === 'win32'){
            pioLocation =  path.join(getAppPath(), '/extra_resources/windows/.platformio/penv/Scripts/pio.exe')
        }
        else if(process.platform === 'darwin'){
            pioLocation =  path.join(getAppPath(), '/extra_resources/mac/.platformio/penv/bin/pio')
        }

        // Create pio project
        console.log(`${pioLocation} project init --project-dir ${projectPath}`)
        const pio = spawn(pioLocation, ['project', 'init', '--project-dir', projectPath])
        pio.stdout.on('data', data => {
            // socket.emit('term', data + '')
            console.log(data + '')
        })
        pio.stderr.on('data', data => {
            // socket.emit('term', data + '')
            console.error(data + '')
        })
        pio.on('error', (error) => {
            console.error(`error: ${error.message}`);
            // socket.emit('term', `error: ${error.message}`)
        });
        pio.on('close', code => {
            console.log(`child process exited with code ${code}`);
            socket.emit('term', `child process exited with code ${code}`)

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
            const maincppPath = path.join(projectPath, '/src/main.cpp')
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
            fs.writeFileSync(path.join(projectSettingsPath), projectSettingsStr)

            // PROJECT LOADED!
            socket.emit('create_project', {
                status: 'ok'
            })

            global.projectLoaded = true
            global.projectName = projectName
            global.projectPath = projectPath
        });
    })

    // Change Project
    socket.on('change_project', () => {
        const f = dialog.showOpenDialogSync(global.win,{
            properties: ['openDirectory'],
            message: 'Change Project',
            buttonLabel: 'Select Project'
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

                    socket.emit('change_project', {
                        status: 'ok'
                    })
                }
                else{
                    console.log(`${f[0]} is not a YETENEK IDE Project Folder.`)
                    socket.emit('change_project', {
                        error: `${f[0]} is not a YETENEK IDE Project Folder.`
                    })
                }
            }
            catch(err){
                console.log("Directory does not exist.")
            }
        }
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

        if(global.uploading){
            console.log('Upload in progres. Please wait...')
            socket.emit('term', '')
            socket.emit('term', 'Upload in progres. Please wait...')
            socket.emit('term', '')
            return
        }
        global.uploading = true

        console.log()
        console.log('---------------- UPLOAD ----------------')
        console.log('PORT: ' + data.port)
        console.log()
        console.log(data.code)
        console.log('----------------------------------------')
        console.log()

        // Pio Location
        let pioLocation = null
        if(process.platform === 'win32'){
            pioLocation =  path.join(getAppPath(), '/extra_resources/windows/.platformio/penv/Scripts/pio.exe')
        }
        else if(process.platform === 'darwin'){
            console.warn('MAC OS IS NOT IMPLEMENTED !')
        }

        let termCmd = ''
        if(data.port === 'auto'){
            termCmd = `${pioLocation} --target upload --project-dir ${global.projectPath}\n`
        }
        else{
            termCmd = `${pioLocation} --target upload --upload-port ${data.port} --project-dir ${global.projectPath}\n`
        }

        socket.emit('term', termCmd)
        const cmd = ['run', '--target', 'upload']
        if(data.port !== 'auto'){
            cmd.push('--upload-port')
            cmd.push(data.port)
        }
        cmd.push('--project-dir')
        cmd.push(global.projectPath)

        const pio = spawn(pioLocation, cmd)
        pio.stdout.on('data', data => {
            console.log(data + '')
            socket.emit('term', data + '')
        })
        pio.stderr.on('data', data => {
            console.error(data + '')
            socket.emit('term', data + '')
        })
        pio.on('error', (error) => {
            console.error(`error: ${error.message}`);
            socket.emit('term', `error: ${error.message}`)
        });
        pio.on('close', code => {
            console.log(`child process exited with code ${code}`);
            socket.emit('term', `child process exited with code ${code}`)
            socket.emit('term', '')
            socket.emit('term', '')
            global.uploading = false
        });
    })
});

// ----------------------------------------------------------------------------
// Start the Server
// ----------------------------------------------------------------------------
httpServer.listen(8000, 'localhost', () => console.log('HTTP Server started on 8000.'));