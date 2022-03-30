@echo off
rem https://www.tutorialspoint.com/batch_script/batch_script_echo.htm
rem https://superuser.com/questions/1252486/how-can-i-silence-all-output-from-a-command-in-a-batch-file
rem https://superuser.com/questions/527812/how-can-i-make-my-bat-file-continue-after-an-error
rem https://superuser.com/questions/328281/how-do-i-delete-directory-trees-via-batch-file-on-windows-7
rem https://www.lifewire.com/xcopy-command-2618103
rem https://stackoverflow.com/questions/68085375/cannot-find-module-fs-promises-electron-js
rem npm i -D electron-builder@~22.10.5 (for Node 12.16.3)

echo Clearing extra_resources directory...
del /s /f /q extra_resources\*.*
for /f %%f in ('dir /ad /b extra_resources\') do rd /s /q extra_resources\%%f

rem if exist .\extra_resources\ echo "extra_resources exists"
if not exist .\extra_resources\ echo "Creating extra_resources directory." && mkdir .\extra_resources\

echo Copying yetenek-ide-pio-windows into extra_resources directory...
xcopy ".\yetenek-ide-pio-windows\" ".\extra_resources\.platformio\" /e /i /y /c /q

echo Copying yetenek-ide-library into extra_resources directory...
xcopy ".\yetenek12-library\" ".\extra_resources\yetenek12-library\" /e /i /y /c /q

echo Copying src/workspace.xml into extra_resources directory...
xcopy ".\workspace.xml" ".\extra_resources\workspace.xml" /e /i /y /c /q

echo Clearing build directory...
del /s /f /q build\*.*
for /f %%f in ('dir /ad /b build\') do rd /s /q build\%%f

echo Building...
cmd.exe /c npm run rebuild-app >NUL 2>&1
npm run build-app