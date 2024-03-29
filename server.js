const { dialog } = require('electron');
const http = require('http');
const express = require('express');
const app = express();
const socketIO = require('socket.io');
const morgan = require('morgan');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const { SerialPort } = require('serialport');
const Shell = require('node-powershell');
const { app: electronApp } = require('electron');
const { reject } = require('lodash');
const lnk = require('lnk');
const os = require('os');
const fixPath = require('fix-path');

// GLOBAL CONSTANTS
global.PROJECT_SETTINGS = '/yetenekide.projectsettings';
global.WORKSPACE_XML = '/workspace';
global.MAIN_CPP = '/src/main.cpp';

// GLOBAL STATE
global.projectLoaded = false;
global.projectName = '';
global.projectPath = '';
global.xml = '';
global.code = '';
global.monitor = null;
global.pioState = null;

// ----------------------------------------------------------------------------
// Startup Check (Windows)
// ----------------------------------------------------------------------------
function createSymlink() {
    return new Promise((resolve, reject) => {
        if (process.platform === 'win32') {
            const ps = new Shell({
                executionPolicy: 'Bypass',
                noProfile: true,
            });

            try {
                fs.accessSync('C:\\.platformio');
                console.log('C:\\.platformio exists.');

                const stats = fs.lstatSync('C:\\.platformio');
                if (stats.isSymbolicLink()) {
                    const linkTarget = fs.readlinkSync('C:\\.platformio');

                    try {
                        fs.accessSync(linkTarget);
                        return resolve();
                    } catch (err) {}

                    fs.unlinkSync('C:\\.platformio');
                    console.log('successfully deleted C:\\.platformio');
                    throw new Error('Recreate symlink');
                }

                return resolve();
            } catch (err) {
                // console.log("Creating symlink for C:\\.platformio")
                // const cmd = `Start-Process -WindowStyle hidden cmd -Verb RunAs -ArgumentList '/c mklink /d "C:\\.platformio" "${path.join(getAppPath(), '/extra_resources/.platformio')}"'`
                // console.log(cmd)
                // ps.addCommand(cmd);
                // ps.invoke()
                // .then(output => {
                //     console.log(output);
                //     resolve()
                // })
                // .catch(err => {
                //     console.log(err);
                //     reject()
                // });

                const srcPath = path.join(getAppPath(), '/extra_resources/.platformio');
                const destPath = 'C:\\.platformio';
                console.log(`Copying .platformio from "${srcPath}" to "${destPath}" ...`);

                fse.copy(srcPath, destPath)
                    .then(() => {
                        console.log('.platformio copied.');
                        resolve();
                    })
                    .catch((err) => {
                        console.error('.platformio copy failed.');
                        console.error(err);
                        reject(err);
                    });
            }
        } else {
            resolve();
        }
    });
}

// ----------------------------------------------------------------------------
// Utils
// ----------------------------------------------------------------------------

function getAppPath() {
    const appPath = electronApp.getAppPath();
    if (appPath.endsWith('.asar')) {
        return path.parse(appPath).dir;
    } else {
        return appPath;
    }
}

function runPIO(socket, cmdArr, onClose, onStart) {
    // let pioLocation = null;
    // if (process.platform === 'win32') {
    //     pioLocation = path.join(getAppPath(), '/extra_resources/.platformio/penv/Scripts/pio.exe');
    // } else if (process.platform === 'darwin') {
    //     pioLocation = path.join(getAppPath(), '/extra_resources/.platformio/penv/bin/pio');
    // }
    const pioLocation = pioState.platformio_exe;

    const msg = `${pioLocation} ${cmdArr.join(' ')}`;
    console.log(msg);
    socket.emit('term', msg);

    let err = null;
    const pio = spawn(pioLocation, cmdArr);
    pio.stdout.on('data', (data) => {
        const msg = data + '';
        console.log(msg);
        socket.emit('term', msg);
    });
    pio.stderr.on('data', (data) => {
        const msg = data + '';
        console.error(msg);
        socket.emit('term', msg, 'error');
    });
    pio.on('error', (error) => {
        const msg = `error: ${error.message}`;
        console.error(msg);
        socket.emit('term', msg);

        err = error;
        // if(onClose) onClose(error)
    });
    pio.on('close', (code) => {
        // https://stackoverflow.com/questions/18694684/spawn-and-kill-a-process-in-node-js
        pio.stdout.destroy();
        pio.stderr.destroy();
        pio.kill('SIGINT');

        const msg = `child process exited with code ${code}`;
        console.log(msg);
        socket.emit('term', msg, 'close');
        socket.emit('term', '');
        socket.emit('term', '');

        if (onClose) {
            if (code === 0) {
                onClose();
            } else {
                if (err) onClose(err);
                else onClose(new Error(msg));
            }
        }
    });

    if (onStart) onStart(pio);
}

// -------- ARDUINO UNO (WINDOWS) --------
// {
//     path: 'COM4',
//     manufacturer: 'wch.cn',
//     serialNumber: '5&58ce05&0&1',
//     pnpId: 'USB\\VID_1A86&PID_7523\\5&58CE05&0&1',
//     locationId: 'Port_#0001.Hub_#0002',
//     friendlyName: 'USB-SERIAL CH340 (COM4)',
//     vendorId: '1A86',
//     productId: '7523'
// }
async function runMonitor2(socket, port, baud) {
    // Kill existing
    await killMonitor2(socket);

    return new Promise((resolve, reject) => {
        const msg = '-------- Starting Serial Monitor --------';
        socket.emit('term', msg);
        console.log(msg);

        SerialPort.list()
            .then((serials) => (serials.length > 0 ? serials[0].path : null))
            .then((defaultPort) => {
                if (!port || port === 'auto') {
                    port = defaultPort;
                }
                if (!baud || baud === 'auto') {
                    baud = 115200;
                } else {
                    baud = parseInt(baud, 10);
                }

                if (!port) {
                    const msg = `Serial monitor not found. Please connect the device.`;
                    console.error(msg);
                    socket.emit('term', msg, 'error');
                    socket.emit('serial_status', false);
                    return reject(msg);
                }

                const monitor = new SerialPort({ path: port, baudRate: baud });
                global.monitor = monitor;

                monitor.on('error', (e) => {
                    const msg = `Serial Monitor Error: ${e}`;
                    console.error(msg);
                    socket.emit('term', msg, 'error');
                    console.error('Serial Monitor Error: ', e);
                });
                monitor.on('open', () => {
                    const msg = `Serial Monitor is now open. (${port}) (Baud: ${baud})`;
                    console.log(msg);
                    socket.emit('term', msg);
                    // monitor.close()
                    socket.emit('serial_status', true);
                    return resolve();
                });
                monitor.on('close', () => {
                    const msg = `Serial Monitor closed: ${port}`;
                    console.log(msg);
                    socket.emit('term', msg);
                });
                monitor.on('readable', () => {
                    const data = monitor.read().toString('utf8');
                    console.log('Data: ', data);
                    socket.emit('term', data);
                });

                // console.log(monitor)
                // monitor.close()
            })
            .catch((err) => {
                console.error(err);
                return reject(err);
            });
        // const monitor = new SerialPort({ path: '/dev/port', baudRate: 9600 })
    });
}

async function killMonitor2(socket) {
    return new Promise((resolve, reject) => {
        if (global.monitor) {
            const msg = '-------- Closing Serial Monitor --------';
            socket.emit('term', msg);
            console.log(msg);
            socket.emit('serial_status', false);

            global.monitor.close((err) => {
                // if(err) console.error('Serialport close error: ', err)
                // else console.log('Serialport closed.')
                global.monitor = null;

                if (err) return reject(err);
                else return resolve();
            });
        } else return resolve();
    });
}

function runMonitor(socket, port, baud) {
    // Kill existing
    killMonitor(socket);

    const msg = '-------- Starting Serial Monitor --------';
    socket.emit('term', msg);
    console.log(msg);

    // -------- SERIAL MONITOR
    const cmd = ['device', 'monitor'];
    if (port && port !== 'auto') {
        cmd.push('--port');
        cmd.push(port);
    }

    if (baud && baud !== 'auto') {
        cmd.push('--baud');
        cmd.push(baud);
    }

    // --------
    runPIO(
        socket,
        cmd,
        (err) => {
            console.error('CLOSE ', err);
        },
        (proc) => {
            global.monitor = proc;
        }
    );
}

function killMonitor(socket) {
    if (global.monitor) {
        const msg = '-------- Closing Serial Monitor --------';
        socket.emit('term', msg);
        console.log(msg + ' (SIGINT)');

        global.monitor.kill('SIGINT');
        global.monitor = null;
    }
}

// ----------------------------------------------------------------------------
// Body Parser
// ----------------------------------------------------------------------------

// https://jorge.fbarr.net/2011/04/03/nginx-error-413-request-entity-too-large/
// https://stackoverflow.com/questions/19917401/error-request-entity-too-large
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

// ----------------------------------------------------------------------------
// Logging (only if NOT "production")
// ----------------------------------------------------------------------------

if (app.get('env') !== 'production') {
    app.use(morgan('tiny'));
    console.log('Development Logging Active!');
}

// ----------------------------------------------------------------------------
// Serve Static Files
// ----------------------------------------------------------------------------

app.use('/', express.static(`${__dirname}/src`, { extensions: ['html'] }));
app.use('/blockly', express.static(`${__dirname}/blockly`));

// ----------------------------------------------------------------------------
// HTTP SERVER
// ----------------------------------------------------------------------------
const httpServer = http.createServer(app);
const io = socketIO(httpServer);

// ----------------------------------------------------------------------------
// SOCKET IO
// ----------------------------------------------------------------------------

io.on('connection', (socket) => {
    // init
    socket.on('init', () => {
        socket.emit('init', {
            projectLoaded: global.projectLoaded,
            projectName: global.projectName,
            projectPath: global.projectPath,
            xml: global.xml,
            code: global.code,
        });
    });

    // welcome (check git & python & pio)
    socket.on('welcome', async () => {
        socket.emit('os', process.platform);

        // ---- CHECK GIT ----
        cmd = 'git --version';
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                socket.emit('welcome', { git: false });
                return console.error(err);
            }

            console.log(cmd);
            process.stdout.write(stdout);
            process.stderr.write(stderr);
            const gitVersion = stdout;

            // ---- CHECK PYTHON ----
            cmd = 'python3 --version';
            if (process.platform === 'darwin') {
                fixPath();
                let env_variables = 'PATH=' + process.env.PATH;
                cmd = env_variables + ' python3 --version';
            }

            exec(cmd, (err, stdout, stderr) => {
                if (err) {
                    socket.emit('welcome', { git: true, gitVersion, python: false });
                    return console.error(err);
                }
                console.log(cmd);
                process.stdout.write(stdout);
                process.stderr.write(stderr);
                const pythonVersion = stdout;

                if (pythonVersion.startsWith('Python 3')) {
                    const getPioPath = path.join(getAppPath(), '/extra_resources/getpio.py');
                    const pioStatePath = path.join(os.tmpdir(), `piostate.json`);
                    cmd = `python3 "${getPioPath}" check core --dump-state ${pioStatePath}`;
                    exec(cmd, (err, stdout, stderr) => {
                        if (err) {
                            // console.error(err);
                            console.log('installing pio ...');
                            socket.emit('welcome', {
                                git: true,
                                gitVersion,
                                python: true,
                                pythonVersion,
                                pio: false,
                                installingPio: true,
                            });

                            cmd = `python3 "${getPioPath}"`;
                            exec(cmd, (err, stdout, stderr) => {
                                if (err) {
                                    socket.emit('welcome', {
                                        python: true,
                                        pythonVersion,
                                        pio: false,
                                        installingPio: false,
                                        pioError: true,
                                    });
                                    return console.error(err);
                                }
                                console.log(cmd);
                                process.stdout.write(stdout);
                                process.stderr.write(stderr);
                                console.log('installing pio done.');
                                socket.emit('welcome', {
                                    git: true,
                                    gitVersion,
                                    python: true,
                                    pythonVersion,
                                    pio: true,
                                    installingPio: false,
                                    refresh: true,
                                });
                            });
                            return;
                        }
                        console.log(cmd);
                        process.stdout.write(stdout);
                        process.stderr.write(stderr);

                        const pioStateStr = fs.readFileSync(pioStatePath);
                        const pioState = JSON.parse(pioStateStr);
                        console.log(pioState);
                        socket.emit('welcome', {
                            git: true,
                            gitVersion,
                            python: true,
                            pythonVersion,
                            pio: true,
                            installingPio: false,
                            pioState,
                        });

                        // {
                        //     core_version: '6.0.2',
                        //     python_version: '3.8.2',
                        //     core_dir: 'C:\\Users\\Emre Onrat\\.platformio',
                        //     cache_dir: 'C:\\Users\\Emre Onrat\\.platformio\\.cache',
                        //     penv_dir: 'C:\\Users\\Emre Onrat\\.platformio\\penv',
                        //     penv_bin_dir: 'C:\\Users\\Emre Onrat\\.platformio\\penv\\Scripts',
                        //     platformio_exe: 'C:\\Users\\Emre Onrat\\.platformio\\penv\\Scripts\\platformio.exe',
                        //     installer_version: '1.1.1',
                        //     python_exe: 'C:\\Users\\Emre Onrat\\.platformio\\penv\\Scripts\\python.exe',
                        //     system: 'windows_amd64',
                        //     is_develop_core: false
                        // }
                        global.pioState = pioState;
                    });
                } else {
                    socket.emit('welcome', { git: true, gitVersion, python: false, pio: false });
                }
            });
        });
    });

    // Create Project Form (update path OR name)
    socket.on('create_form_update', (data) => {
        // console.log(data)
        let formError = null;

        if (data.showDialog) {
            const f = dialog.showOpenDialogSync(global.win, {
                properties: ['openDirectory'],
                message: 'Proje Oluştur',
                buttonLabel: 'Seç',
            });

            // array of paths OR undefined
            if (f) {
                data.projectPath = f[0] + path.sep + 'project-' + Date.now();
                // console.log(f[0])
            }
        }

        let projectName = data.projectName;
        projectName = _.trim(projectName);
        projectName = _.deburr(projectName);
        projectName = _.kebabCase(projectName);

        if (projectName.length === 0) {
            projectName = 'project-' + Date.now();
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
        if (!data.projectPath) {
            data.projectPath = electronApp.getPath('documents') + path.sep + projectName;
        }

        const projectDir = path.parse(data.projectPath).dir;
        const projectPath = projectDir + path.sep + projectName;

        socket.emit('create_form_update', {
            projectPath,
        });
    });

    // Create New Project
    socket.on('create_project', (data) => {
        let err = false;
        let projectName = data.projectName;
        const projectPath = data.projectPath;

        if (projectName.length === 0) {
            projectName = 'Yeni Proje';
        }

        // https://coderrocketfuel.com/article/check-if-a-directory-exists-in-node-js
        try {
            fs.accessSync(projectPath);
            console.log('Directory exists.');

            socket.emit('create_project', {
                error: 'Bu klasör zaten var.',
            });
            return;
        } catch (err) {
            console.log('Directory does not exist.');
        }

        // create symlink (Elevate Privileges) (windows)
        // createSymlink()
        //     .then(() => {
        //         // ...
        //     })
        //     .catch(() => {
        //         console.error('Elevation Error!');
        //         socket.emit('create_project', {
        //             // error: 'İşlem Reddedildi.'
        //             error: 'Erisim Reddedildi. Programi yonetici olarak calistirin.',
        //         });
        //     });

        // Create directory
        // https://joshtronic.com/2021/01/17/recursively-create-directories-with-nodejs/
        fs.mkdirSync(projectPath, { recursive: true });

        // Create pio project
        const cmd = ['project', 'init', '--project-dir', projectPath];
        runPIO(socket, cmd, (err) => {
            if (err) {
                console.error('CREATE Project Error: ', err);
                socket.emit('create_project', {
                    // error: 'Create project failed.\n' + err.toString() + err.stack
                    error: 'Proje olusturulamadi.',
                });
                return;
            }

            // --------------------------------------------------------------------------
            // https://stackoverflow.com/questions/13786160/copy-folder-recursively-in-node-js
            // https://www.npmjs.com/package/fs-extra
            // Copy yetenek12-library to the project
            try {
                fse.copySync(
                    path.join(getAppPath(), '/extra_resources/yetenek12-library'),
                    path.join(projectPath, '/lib/yetenek12-library')
                );
                console.log('yetenek12-library copied.');
            } catch (err) {
                console.error('Copy yetenek12-library error: ' + err);
            }

            // --------------------------------------------------------------------------
            // Configure platformio.ini
            const pioIniPath = path.join(projectPath, '/platformio.ini');
            let pioIni = fs.readFileSync(pioIniPath, 'utf8');
            if (global.TARGET_ARDUINO) {
                pioIni += '\n';
                pioIni += '[env:uno]\n';
                pioIni += 'platform = atmelavr\n';
                pioIni += 'board = uno\n';
                pioIni += 'framework = arduino\n';
                pioIni += '\n';
            } else {
                pioIni += '\n';
                pioIni += '[env:pico32]\n';
                pioIni +=
                    'platform = https://github.com/platformio/platform-espressif32.git#feature/arduino-upstream\n';
                pioIni +=
                    'platform_packages = platformio/framework-arduinoespressif32 @ https://github.com/espressif/arduino-esp32.git#2.0.1\n';
                pioIni += 'board = pico32\n';
                pioIni += 'framework = arduino\n';
                pioIni += '\n';
            }
            fs.writeFileSync(path.join(pioIniPath), pioIni);

            // Create main.cpp
            const maincppPath = path.join(projectPath, global.MAIN_CPP);
            let maincpp = '';
            maincpp += '#include <Arduino.h>\n\n';
            maincpp += 'void setup(){\n\n';
            maincpp += '}\n\n';
            maincpp += 'void loop(){\n\n';
            maincpp += '}\n\n';
            fs.writeFileSync(maincppPath, maincpp);

            // Create Project Settings
            const projectSettings = {};
            projectSettings.projectName = projectName;

            const projectSettingsPath = path.join(projectPath, global.PROJECT_SETTINGS);
            const projectSettingsStr = JSON.stringify(projectSettings);
            fs.writeFileSync(projectSettingsPath, projectSettingsStr);

            // Create XML
            let workspaceStr = '';
            try {
                workspaceStr = fs.readFileSync('./src/workspace.xml', 'utf8');
            } catch (err) {
                console.warn('workspace.xml not found on "./src/workspace.xml"');
                let workspaceTemplatePath = path.join(getAppPath(), '/extra_resources/workspace.xml');

                try {
                    workspaceStr = fs.readFileSync(workspaceTemplatePath, 'utf8');
                } catch (err) {
                    console.warn(`workspace.xml not found on "${workspaceTemplatePath}"`);
                    console.error('Using default template for workspace.xml');
                    workspaceStr =
                        '<xml xmlns="https://developers.google.com/blockly/xml"><block type="base_start" deletable="false" movable="false"></block></xml>';
                }
            }

            path.join(getAppPath(), '/extra_resources/.platformio');
            // const workspaceStr = '<xml xmlns="https://developers.google.com/blockly/xml"><block type="base_start" deletable="false" movable="false"></block></xml>'
            const workspacePath = path.join(projectPath, global.WORKSPACE_XML);
            fs.writeFileSync(workspacePath, workspaceStr);

            // PROJECT CREATED!
            global.projectLoaded = true;
            global.projectName = projectName;
            global.projectPath = projectPath;
            global.xml = workspaceStr;
            global.code = maincpp;

            socket.emit('create_project', {
                status: 'ok',
            });
        });
    });

    // Change Project
    socket.on('change_project', () => {
        // create symlink (Elevate Privileges) (windows)
        // createSymlink()
        //     .then(() => {
        //         // ...
        //     })
        //     .catch(() => {
        //         console.error('Elevation Error!');
        //     });

        const f = dialog.showOpenDialogSync(global.win, {
            properties: ['openDirectory'],
            message: 'Projeyi Aç',
            buttonLabel: 'Aç',
        });

        if (f && f[0]) {
            // https://coderrocketfuel.com/article/check-if-a-directory-exists-in-node-js
            try {
                fs.accessSync(f[0]);

                const projectSettingsFilePath = path.join(f[0], global.PROJECT_SETTINGS);
                const pioIniFilePath = path.join(f[0], '/platformio.ini');

                const validProject = fs.existsSync(projectSettingsFilePath) && fs.existsSync(pioIniFilePath);
                if (validProject) {
                    console.log(`\nLoading Project: ${f[0]}\n`);

                    // Read Project Settings
                    let projectSettings = {};
                    try {
                        projectSettings = JSON.parse(fs.readFileSync(projectSettingsFilePath, 'utf8'));
                    } catch (err) {
                        socket.emit('change_project', {
                            error: 'Invalid Project File',
                        });
                        return;
                    }

                    global.projectLoaded = true;
                    global.projectName = projectSettings.projectName + '';
                    global.projectPath = f[0] + path.sep;

                    // Read XML
                    try {
                        global.xml = fs.readFileSync(path.join(f[0], global.WORKSPACE_XML), 'utf8');
                    } catch (err) {
                        socket.emit('change_project', {
                            error: 'Invalid Project File',
                        });
                        return;
                    }

                    // Read Code
                    try {
                        global.code = fs.readFileSync(path.join(f[0], global.MAIN_CPP), 'utf8');
                    } catch (err) {
                        socket.emit('change_project', {
                            error: 'Invalid Project File',
                        });
                        return;
                    }

                    // OK
                    socket.emit('change_project', {
                        status: 'ok',
                    });
                } else {
                    console.log(`${f[0]} is not a YETENEK IDE Project Folder.`);
                    socket.emit('change_project', {
                        error: `${f[0]} YETENEK IDE Proje Klasörü değil.`,
                    });
                }
            } catch (err) {
                console.log('Directory does not exist.');
            }
        }
    });

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
        if (SerialPort) {
            SerialPort.list()
                .then((ports) => {
                    // console.log('SERIAL PORTS:')
                    // console.log(ports)
                    socket.emit('ports', {
                        ports,
                    });
                })
                .catch((err) => {
                    console.error(err);
                });
        }
    });

    // Upload Code
    socket.on('upload', (data) => {
        // --------
        if (global.uploading) {
            console.log('Upload/Compile in progres. Please wait...');
            socket.emit('term', '');
            socket.emit('term', 'Upload/Compile in progres. Please wait...');
            socket.emit('term', '');
            return;
        }

        // Disable monitor
        // killMonitor(socket)
        killMonitor2(socket)
            .then(() => {
                // --------
                console.log();
                console.log('---------------- UPLOAD ----------------');
                console.log('PORT: ' + data.port);
                console.log();
                console.log(data.code);
                console.log('----------------------------------------');
                console.log();

                // --------
                const cmd = ['run', '--target', 'upload'];
                if (data.port !== 'auto') {
                    cmd.push('--upload-port');
                    cmd.push(data.port);
                }
                cmd.push('--project-dir');
                cmd.push(global.projectPath);

                // --------
                global.uploading = true;
                runPIO(socket, cmd, () => {
                    global.uploading = false;
                });
            })
            .catch((err) => console.error('killMonitor2() ERR'));
    });

    // Compile Code
    socket.on('compile', (data) => {
        // --------
        if (global.uploading) {
            console.log('Upload/Compile in progres. Please wait...');
            socket.emit('term', '');
            socket.emit('term', 'Upload/Compile in progres. Please wait...');
            socket.emit('term', '');
            return;
        }

        // Disable monitor
        // killMonitor(socket)
        killMonitor2(socket);

        // --------
        console.log();
        console.log('---------------- COMPILE ----------------');
        console.log();
        console.log(data.code);
        console.log('----------------------------------------');
        console.log();

        // --------
        const cmd = ['run'];
        // if(data.port !== 'auto'){
        //     cmd.push('--upload-port')
        //     cmd.push(data.port)
        // }
        cmd.push('--project-dir');
        cmd.push(global.projectPath);

        // --------
        global.uploading = true;
        runPIO(socket, cmd, () => {
            global.uploading = false;
        });
    });

    // Save Project
    socket.on('save', (data) => {
        console.log('Saving Project...');

        // Save main.cpp
        const maincppPath = path.join(projectPath, global.MAIN_CPP);
        fs.writeFileSync(maincppPath, data.code);

        // Save XML
        const workspacePath = path.join(projectPath, global.WORKSPACE_XML);
        fs.writeFileSync(workspacePath, data.xml);
    });

    // Serial Status
    socket.on('serial_status', (data) => {
        if (global.uploading) {
            console.log('Upload/Compile in progres. Please wait...');
            socket.emit('term', '');
            socket.emit('term', 'Upload/Compile in progres. Please wait...');
            socket.emit('term', '');
            socket.emit('serial_status', false);
            return;
        }

        if (data.enable) {
            // runMonitor(socket, data.port, data.baud);
            runMonitor2(socket, data.port, data.baud)
                .then(() => console.log('runMonitor2() OK.'))
                .catch((err) => console.error('runMonitor2() ERR'));
        } else {
            // killMonitor(socket);
            killMonitor2(socket)
                .then(() => console.log('killMonitor2() OK.'))
                .catch((err) => console.error('killMonitor2() ERR'));
        }
    });
});

// ----------------------------------------------------------------------------
// Start the Server
// ----------------------------------------------------------------------------
httpServer.listen(8000, 'localhost', () => console.log('HTTP Server started on 8000.'));
