# YETENEK IDE

[![CI](https://github.com/yetenek12/yetenek-ide/actions/workflows/main.yml/badge.svg)](https://github.com/yetenek12/yetenek-ide/actions/workflows/main.yml)

🎱 NodeJS Version: **16.14.0 (LTS)**

```bash
    nvm install 16.14.0
    nvm use 16.14.0
```

## Download

[Releases](https://github.com/yetenek12/yetenek-ide/releases)

## Setup

```bash
    git clone --recursive git@github.com:yetenek12/yetenek-ide.git
    npm install --also=dev
    npm run rebuild-app

    # INIT Project (On Windows)
    .\init.bat

    # INIT Project (On Mac OS)
    ./init.sh

    # Update submodules / refs
    # git submodule update --init --recursive

    # https://stackoverflow.com/questions/10906554/how-do-i-revert-my-changes-to-a-git-submodule
    # RESET SUBMODULE CHANGES
    # git restore . --recurse-submodules
```

## Run

```bash
    npm run start
```

## Contribute

Create a new branch from `development`, make changes and then, create a [Pull Request.](https://github.com/yetenek12/yetenek-ide/pulls)  
Ex:  
```bash
    git switch dev
    git pull
    git switch -c dev-myname-my-feature
    # COMMIT CHANGES
    # ...
    git push --set-upstream origin dev-myname-my-feature
    # COMMIT MORE CHANGES
    #...
    git push

    # --------
    # LIST BRANCHES
    git branch -vav
```

## CI

```bash
    # List tags
    git tag

    # Add new tag
    git tag vX.Y.Z

    # Push new tag
    git push origin vX.Y.Z
```

## Building Blockly (ONLY IF YOU MADE CHANGES INSIDE `/blockly`! ⚠️)

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
    ./build.sh
```

## Known Issues

- In order to upload code in Windows, you need admin priviliges.

- Because of Python, there should be no spaces in the location where the program is installed. (Only for Mac)
To fix: https://stackoverflow.com/questions/20095351/shebang-use-interpreter-relative-to-the-script-path/33225909#33225909
