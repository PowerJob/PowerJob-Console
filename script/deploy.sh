#!/bin/sh
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$project_dir"
npm run build_spring
if [ "$#" -eq 0 ]; then
  echo "Built Server assets in $project_dir/dist. Pass a destination directory explicitly to copy them."
  exit 0
fi
if [ "$#" -ne 1 ] || [ ! -d "$1" ]; then
  echo 'Usage: script/deploy.sh [existing-static-directory]' >&2
  exit 1
fi
cp -R dist/. "$1/"
echo 'Console assets copied to the selected directory.'
