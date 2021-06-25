# YETENEK IDE

🎱 NodeJS Version: **12**

## Setup

```bash
    git clone git@github.com:yetenek12/yetenek-ide.git
    cd yetenek-ide

    git submodule init
    git submodule update

    npm install
    npm install --only=dev
    npm install -g electron-builder
    
    npm run rebuild-app
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
    npm run build
```

## Building for Windows

```bash
    # Use a Windows machine
    # SETUP: Copy .platformio folder to /extra_resources/windows/.platformio
    # SETUP: Make sure /extra_resources/mac/ folder is empty!
    #
    # Delete /build folder from the project before every build!

    npm run rebuild-app
    npm run build-app
```

## Building for Mac

```bash
    # Use a Mac OS machine
    # SETUP: Copy .platformio folder to /extra_resources/mac/.platformio
    # SETUP: Make sure /extra_resources/windows/ folder is empty!
    #
    # Delete /build folder from the project before every build!

    npm run rebuild-app
    npm run build-app
```
