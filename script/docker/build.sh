#!/bin/sh
set -eu
if [ "$#" -ne 1 ]; then
  echo 'Usage: script/docker/build.sh <image-tag>' >&2
  exit 1
fi
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$project_dir"
npm ci
npm run build
docker build -f script/docker/Dockerfile -t "$1" .
