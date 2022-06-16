import fs from 'fs-extra';
import os from 'node:os';

// python
// https://stackoverflow.com/questions/20095351/shebang-use-interpreter-relative-to-the-script-path/33225909#33225909

const platform = os.platform();
const arch = os.arch();
const target = `${platform} (${arch})`;

console.log(`Initializing the project for ${target} ...`);
fs.removeSync('extra_resources');
fs.ensureDirSync('extra_resources');

console.log('Copying yetenek12 library ...');
fs.copySync('yetenek12-library', 'extra_resources/yetenek12-library');

console.log('Copying workspace.xml ...');
fs.copyFileSync('src/workspace.xml', 'extra_resources/workspace.xml');

console.log('Copying getpio.py ...');
fs.copyFileSync('src/getpio.py', 'extra_resources/getpio.py');

console.log('Clearing build directory ...');
fs.removeSync('build');
fs.ensureDirSync('build');

console.log('Project is initialized');
