# YETENEK IDE

🎱 NodeJS Version: **12**

## Download

[Releases](https://github.com/yetenek12/yetenek-ide/releases)

## Setup

```bash
    git clone --recursive git@github.com:yetenek12/yetenek-ide.git
    npm install --also=dev
```

## Run

```bash
    npm run start
```

## Building Blockly

- Don't forget to commit submodule if you make any changes.
- Arduino Blocks: **/blockly/blocks**
- Arduino Generator: **/blockly/generators/arduino**
- Arduino Generator Build Command: **/blockly/scripts/gulpfiles/build_tasks.js** | Line: 339

```bash
    # You must have Python 3 installed and added to your path!

    cd blockly

    npm install --also=dev
    npm run build
```

## Building for Windows

```bash
    # Use a Windows machine
    # Default Install Location: "C:\Users\__USERNAME__\AppData\Local\Programs\YETENEK IDE"
    .\build.bat
```

## Building for Mac

```bash
    # Use a Mac OS machine
    # Clear /build folder!
    # Clear /extra_resources folder!
    # Copy /yetenek-ide-pio-mac folder into /extra_resources as /.platformio
    # Copy /yetenek12-library folder into /extra_resources as /yetenek12-library

    npm run rebuild-app
    npm run build-app
```
