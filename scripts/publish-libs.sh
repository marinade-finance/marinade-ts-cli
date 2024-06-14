#!/bin/bash

# Publishing the packages/libs into npm registry
# ---
# There is an error that I (chalda) haven't been able to fix yet (knowledge+lack of time)
# That pnpm `workspace:` depedency is not correctly translated to npm published package
# and when the dependency uses `workspace:` then command `npm install -g ...` fails
# to load such dependencies when running as a global command at the system.
# I think the `npm` does not understand the `workspace:` prefix as it's from `pnpm`. Not sure though.


# This script thus stripping the `workspace:` prefix from the `dependencies` in `package.json`
# and then publishing the package to npm registry
# and then placing it back to the `package.json` file.

if [ -z "$1" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

SCRIPT_PATH=`readlink -f "$0"`
SCRIPT_DIR=`dirname "$SCRIPT_PATH"`
VERSION=`cat $SCRIPT_DIR/../packages/lib/ts-common/package.json | grep version | cut -d '"' -f 4`
NEW_VERSION="$1"

set -e
pnpm install
pnpm build

find -name package.json | xargs -I file sed -i 's/workspace:[ \t]*//' file
find -name package.json | xargs -I file sed -i "s/${VERSION}/${NEW_VERSION}/" file

echo "Going to publish the packages/libs to npm registry, from version ${VERSION} to ${NEW_VERSION}"
read -p "Press enter to continue"

git add .
git ci -m "[chore] bump version to ${NEW_VERSION}"

pnpm publish:libs

find -name package.json | xargs -I file sed -i 's/\(@marinade.finance[^:]*: "\)'"${NEW_VERSION}"'/\1workspace: '"${NEW_VERSION}"'/' file
pnpm install