#!/bin/bash
set -euvo pipefail
IFS=$'\n\t'

FILENAME="$ROCKET_DEPLOY_DIR/rocket-$CIRCLE_SHA1.tgz";

ln -s /tmp/build/Rocket.Chat.tar.gz "$FILENAME"
# gpg --armor --detach-sign "$FILENAME"
