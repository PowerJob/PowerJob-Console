import { execFileSync } from 'node:child_process'

// macOS Info-ZIP may print or extract UTF-8 names through its locale conversion.
// Python's ZIP reader follows the archive UTF-8 flag and verifies CRCs without rewriting the original archive.
export function zipEntries(archive: string): string[] {
  return JSON.parse(execFileSync('python3', ['-c', 'import json,sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); bad=z.testzip(); assert bad is None; print(json.dumps(z.namelist(),ensure_ascii=True))', archive], { encoding: 'utf8' })) as string[]
}
export function zipEntry(archive: string, name: string): Buffer {
  return execFileSync('python3', ['-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); sys.stdout.buffer.write(z.read(sys.argv[2]))', archive, name])
}
export function extractZip(archive: string, destination: string) {
  execFileSync('python3', ['-c', 'import pathlib,sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); names=z.namelist(); assert all(not pathlib.PurePosixPath(n).is_absolute() and ".." not in pathlib.PurePosixPath(n).parts for n in names); assert z.testzip() is None; z.extractall(sys.argv[2])', archive, destination])
}
