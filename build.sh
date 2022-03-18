#!/bin/bash
echo "Working.."
rm -rf extra_resources
mkdir -p extra_resources/.platformio
mkdir -p extra_resources/yetenek12-library/
rsync -a yetenek-ide-pio-mac/* extra_resources/.platformio/
rsync -a yetenek12-library/* extra_resources/yetenek12-library/
echo "Building.."
rm -rf build
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run rebuild-app
npm run build-app
echo "Done"