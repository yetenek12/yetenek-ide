const { app, BrowserWindow } = require('electron');
const { stubFalse } = require('lodash');
const url = require('url');
const server = require('./server')

function createWindow() {

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

    // https://stackoverflow.com/questions/49250638/serialport-npm-list-of-available-com-ports
    // https://stackoverflow.com/questions/46384591/node-was-compiled-against-a-different-node-js-version-using-node-module-versio
    // npm run rebuild
    // const serialPort = require('serialport')
    // serialPort.list().then(function (data) {
    //     console.log(data);  
    // });
}

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
