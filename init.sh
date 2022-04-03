#!/bin/bash

echo "init..."
rm -rf extra_resources
mkdir -p extra_resources/.platformio
mkdir -p extra_resources/yetenek12-library/
rsync -a yetenek-ide-pio-mac/* extra_resources/.platformio/
rsync -a yetenek12-library/* extra_resources/yetenek12-library/
rsync -a ./src/workspace.xml extra_resources/workspace.xml
echo "init done."