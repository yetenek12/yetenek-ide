import fs from 'fs-extra';
import { exec } from 'node:child_process';
import { assert } from 'node:console';
import os from 'node:os';

function init(platform, arch, target) {
    console.log('Initializing...');

    console.log('Clearing Extra Resources...');
    fs.removeSync('extra_resources');
    fs.ensureDirSync('extra_resources');

    console.log('Copying .platformio...');
    if (target === 'win32 (x64)') fs.copySync('yetenek-ide-pio-windows', 'extra_resources/.platformio');
    else if (target === 'darwin (x64)') fs.copySync('yetenek-ide-pio-mac', 'extra_resources/.platformio');
    else if (target === 'darwin (arm64)') fs.copySync('yetenek-ide-pio-mac-arm', 'extra_resources/.platformio');
    else assert(false, `${target} is not supported`);

    console.log('Copying yetenek12 library...');
    fs.copySync('yetenek12-library', 'extra_resources/yetenek12-library');

    console.log('Copying workspace.xml...');
    fs.copyFileSync('src/workspace.xml', 'extra_resources/workspace.xml');

    console.log('Initialization completed\n');
}

function build(platform, arch, target) {
    init(platform, arch, target);

    console.log('Building...');

    console.log('Clearing build directory...');
    fs.removeSync('build');
    fs.ensureDirSync('build');

    let rebuildAppCmd = 'npm run rebuild-app';
    let buildAppCmd = 'npm run build-app';
    let ops = {};
    ops.maxBuffer = 1024 * 1024 * 1024;

    if (platform === 'darwin') {
        ops.env = process.env;
        ops.env['DEBUG'] = 'electron-builder';
        ops.env['CSC_IDENTITY_AUTO_DISCOVERY'] = 'false';
    }
    if (platform === 'win32') {
        ops.env = {};
        ops.env['DEBUG'] = 'electron-builder';
        rebuildAppCmd = 'npm run rebuild-app:win32';
        buildAppCmd = 'npm run build-app:win32';
        ops.shell = 'cmd.exe';
        ops.windowsHide = true;
    }

    console.log('cwd:', process.cwd());
    console.log('env:', ops.env);

    console.log('Rebuild App...');
    exec(rebuildAppCmd, ops, (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        if (stderr) console.error(stderr);
        console.log(stdout);

        console.log('Build App...');
        exec(buildAppCmd, ops, (err, stdout, stderr) => {
            if (err) {
                console.error(err);
                process.exit(1);
            }
            if (stderr) console.error(stderr);
            // console.log(stdout);

            console.log('Build completed');
            process.exit(0);
        });
    });
}

const supportedTargets = new Set(['win32 (x64)', 'darwin (x64)', 'darwin (arm64)']);
const platform = os.platform();
const arch = os.arch();
const target = `${platform} (${arch})`;

if (!supportedTargets.has(target)) {
    console.error(`${target} is not supported. Supported targets: ${[...supportedTargets].join(', ')}`);
    process.exit(1);
}
console.log(`Build Target: ${target}`);

const args = [...process.argv];
const initFlag = args.includes('--init') || args.includes('-i');

if (initFlag) init(platform, arch, target);
else build(platform, arch, target);
