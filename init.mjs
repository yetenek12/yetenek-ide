import fs from 'fs-extra';
import os from 'node:os';

// python
// https://stackoverflow.com/questions/20095351/shebang-use-interpreter-relative-to-the-script-path/33225909#33225909

const supportedTargets = new Set(['win32 (x64)', 'darwin (x64)', 'darwin (arm64)']);
const platform = os.platform();
const arch = os.arch();
const target = `${platform} (${arch})`;

if (!supportedTargets.has(target)) {
    console.error(`${target} is not supported. Supported targets: ${[...supportedTargets].join(', ')}`);
    process.exit(1);
}

console.log(`Initializing the project for ${target} ...`);
fs.removeSync('extra_resources');
fs.ensureDirSync('extra_resources');

console.log('Copying .platformio ...');
if (target === 'win32 (x64)') fs.copySync('yetenek-ide-pio-windows', 'extra_resources/.platformio');
else if (target === 'darwin (x64)') fs.copySync('yetenek-ide-pio-mac', 'extra_resources/.platformio');
else if (target === 'darwin (arm64)') fs.copySync('yetenek-ide-pio-mac-arm', 'extra_resources/.platformio');
else {
    console.error(`${target} is not supported!`);
    process.exit(1);
}

console.log('Copying yetenek12 library ...');
fs.copySync('yetenek12-library', 'extra_resources/yetenek12-library');

console.log('Copying workspace.xml ...');
fs.copyFileSync('src/workspace.xml', 'extra_resources/workspace.xml');

console.log('Clearing build directory ...');
fs.removeSync('build');
fs.ensureDirSync('build');

console.log('Project is initialized');
