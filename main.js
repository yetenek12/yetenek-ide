const { app, BrowserWindow } = require('electron');
const { stubFalse } = require('lodash');
const url = require('url');

// https://stackoverflow.com/questions/35916158/how-to-prevent-multiple-instances-in-electron
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
    console.log('There is another instance running. Quitting...')
    app.quit()
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        console.log('Another instance started. Focusing on this...')

        // Someone tried to run a second instance, we should focus our window.
        if (global.win) {
            if (global.win.isMinimized()) {
                global.win.restore()
            }
            global.win.focus()
        }
    })
}

function createWindow() {
    const server = require('./server')

    // https://serialport.io/docs/guide-installation/
    global.win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // win.loadFile('index.html');
    win.loadURL('http://localhost:8000/');

    // https://stackoverflow.com/questions/39091964/remove-menubar-from-electron-app
    win.setMenuBarVisibility(false)

    //
    // win.webContents().openDevTools();
}

if(gotTheLock){
    app.whenReady().then(createWindow);

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
}