@echo off
rem https://www.tutorialspoint.com/batch_script/batch_script_echo.htm
rem https://superuser.com/questions/1252486/how-can-i-silence-all-output-from-a-command-in-a-batch-file
rem https://superuser.com/questions/527812/how-can-i-make-my-bat-file-continue-after-an-error
rem https://superuser.com/questions/328281/how-do-i-delete-directory-trees-via-batch-file-on-windows-7
rem https://www.lifewire.com/xcopy-command-2618103
rem https://stackoverflow.com/questions/68085375/cannot-find-module-fs-promises-electron-js
rem npm i -D electron-builder@~22.10.5 (for Node 12.16.3)

rem init
call init.bat

rem build
echo Building...
cmd.exe /c npm run rebuild-app >NUL 2>&1
npm run build-app