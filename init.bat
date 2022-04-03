@echo off
echo init...

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
copy ".\src\workspace.xml" ".\extra_resources\workspace.xml"

echo Clearing build directory...
if not exist build\ mkdir build\
del /s /f /q build\*.*
for /f %%f in ('dir /ad /b build\') do rd /s /q build\%%f

echo init done.