#!/bin/sh
set -eu
if [ "$#" -ne 1 ]; then printf 'Usage: %s image:tag\n' "$0" >&2; exit 2; fi
console_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$console_root"
npm run build
docker build --file script/docker/Dockerfile --tag "$1" .
