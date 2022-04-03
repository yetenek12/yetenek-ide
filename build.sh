#!/bin/bash

# init
# https://stackoverflow.com/questions/8352851/shell-how-to-call-one-shell-script-from-another-shell-script
sh ./init.sh

# build
echo "Building.."
rm -rf build
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run rebuild-app
#npm run build-app
echo "Done"
