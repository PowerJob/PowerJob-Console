#!/bin/sh
set -eu
# Create a separate release directory; never change a Server checkout or existing deployment.
if [ "$#" -ne 1 ]; then
  printf 'Usage: %s /absolute/path/to/new-console-release-directory\n' "$0" >&2
  exit 2
fi
case "$1" in /*) ;; *) printf 'Target must be an absolute path.\n' >&2; exit 2;; esac
if [ -e "$1" ]; then printf 'Target already exists; select a new release directory.\n' >&2; exit 2; fi
console_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$console_root"
npm run build
mkdir -p "$1"
cp -R dist/. "$1/"
printf 'Console static files are ready in %s\n' "$1"
