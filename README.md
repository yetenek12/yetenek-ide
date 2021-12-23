# YETENEK IDE

🎱 NodeJS Version: **12**  

## Download

[Releases](https://github.com/yetenek12/yetenek-ide/releases)

## Setup

```bash
    git clone git@github.com:yetenek12/yetenek-ide.git
    cd yetenek-ide

    git submodule init
    git submodule update --init --recursive

    npm install
    npm install --only=dev
    npm install -g electron-builder
    
    npm run rebuild-app

    # If you are on Windows:
    # Copy .platformio folder to /extra_resources/windows/.platformio
    # Copy yetenek12-library submodule into /extra_resources/windows/.platformio/platforms/packages/framework-arduinoespressif32/libraries
    # Make sure /extra_resources/mac/ folder is empty!

    # If you are on Mac OS:
    # Copy .platformio folder to /extra_resources/mac/.platformio
    # Copy yetenek12-library submodule into /extra_resources/windows/.platformio/platforms/packages/framework-arduinoespressif32/libraries
    # Make sure /extra_resources/windows/ folder is empty!
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

    npm install
    npm install --only=dev
    npm run build
```

## Building for Windows

```bash
    # Use a Windows machine
    # Delete /build folder from the project before every build!
    # Default Install Location: "C:\Users\__USERNAME__\AppData\Local\Programs\YETENEK IDE"

    npm run rebuild-app
    npm run build-app
```

## Building for Mac

```bash
    # Use a Mac OS machine
    # Delete /build folder from the project before every build!
    #
    # For include Platform IO;
    # -> Install PlatformIO local computer
    # -> Copy .platformio folder to yetenek-ide/extra_resources/mac
    # -> Change first line in extra_resources/mac/.platformio/penv/bin/pio and platformio to
    
    #!/bin/sh
    "exec" "`dirname $0`/python" "$0" "$@"

    [Issue: https://stackoverflow.com/a/33225909]

    npm i -g electron-builder # If it is not installed
    npm run rebuild-app
    npm run build-app
```
