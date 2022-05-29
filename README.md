# YETENEK IDE

[![CI](https://github.com/yetenek12/yetenek-ide/actions/workflows/main.yml/badge.svg)](https://github.com/yetenek12/yetenek-ide/actions/workflows/main.yml)

Every new release should bump the minor version!  
Update the `package.json` before tagging a new release!

---

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
    npm install --production=false
    npm run init
```

## Run

```bash
    npm run start
```

## Contribute

Create a new branch from `development`, make changes and then, create a [Pull Request.](https://github.com/yetenek12/yetenek-ide/pulls)  
Ex:

```bash
    git switch development
    git pull
    git switch -c feature

    # COMMIT CHANGES
    # ...
    git push --set-upstream origin feature

    # COMMIT MORE CHANGES
    #...
    git push

    # --------
    # LIST BRANCHES
    git branch -vav

    # --------
    # Update submodules / refs
    # git submodule update --init --recursive

    # https://stackoverflow.com/questions/10906554/how-do-i-revert-my-changes-to-a-git-submodule
    # git restore . --recurse-submodules
```

## CI Action

```bash
    # List tags
    git tag

    # Add new tag
    git tag vX.Y.Z

    # Push new tag
    git push origin vX.Y.Z

    # https://stackoverflow.com/questions/44702757/how-to-remove-all-git-origin-and-local-tags
    # https://stackoverflow.com/questions/1841341/remove-local-git-tags-that-are-no-longer-on-the-remote-repository
    # git tag -l | xargs git tag -d
    # git fetch --tags
```

## Building for Windows

```bash
    # Use a Windows machine
    # Output: "build\YETENEK Setup 3.0.0.exe"
    # Default Install Location: "C:\Users\__USERNAME__\AppData\Local\Programs\YETENEK IDE"
    npm run init
    npm run rebuild
    npm run build
```

## Building for Mac (x64 or arm64)

```bash
    # Use a Mac OS machine
    npm run init
    npm run rebuild
    npm run build
```

## Building Blockly (ONLY IF YOU MADE CHANGES INSIDE `/blockly`! ⚠️)

-   Don't forget to commit submodule if you make any changes.
-   Arduino Blocks: **/blockly/blocks**
-   Arduino Generator: **/blockly/generators/arduino**
-   Arduino Generator Build Command: **/blockly/scripts/gulpfiles/build_tasks.js** | Line: 339

```bash
    # You must have Python 3 installed and added to your path!

    cd blockly

    npm install --also=dev
    npm run build
```
