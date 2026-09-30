import { readFile, readdir, mkdir, cp, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { version, consoleRelease = version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/.test(version)) throw new Error('A semantic release version is required')
if (!/^\d+\.\d+\.\d+_fev\d+(?:-rc\.\d+)?$/.test(consoleRelease) || consoleRelease.split('_')[0] !== version.split('-')[0]) throw new Error('The Console release must match the Server version prefix')
if (!existsSync(path.join(root, 'dist/index.html'))) throw new Error('Build the Console before packaging')
const name = `powerjob-console-${consoleRelease}`
const output = path.join(root, 'release')
const archive = path.join(output, `${name}.zip`)
if (existsSync(archive)) throw new Error('The release archive already exists; preserve it or select a new version')
const staging = path.join(output, name)
if (existsSync(staging)) throw new Error('Release staging already exists')
await mkdir(staging, { recursive: true })
await cp(path.join(root, 'dist'), path.join(staging, 'dist'), { recursive: true })
await cp(path.join(root, 'README.md'), path.join(staging, 'README.md'))
await cp(path.join(root, 'LICENSE'), path.join(staging, 'LICENSE'))
const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'))
let notices = 'Third-party dependency notices\n\nThis distribution is built with the dependency versions pinned in package-lock.json. The following license and notice texts are retained from the installed packages.\n'
for (const [dependency, metadata] of Object.entries(lock.packages).sort(([a], [b]) => a.localeCompare(b))) {
  if (!dependency || metadata.dev) continue
  const directory = path.join(root, dependency)
  if (!existsSync(path.join(directory, 'package.json'))) continue
  const pkg = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'))
  notices += `\n\n${'='.repeat(72)}\n${pkg.name}@${pkg.version} — ${typeof pkg.license === 'string' ? pkg.license : 'See package license'}\n`
  const files = (await readdir(directory, { withFileTypes: true })).filter(file => file.isFile() && /^(?:licen[cs]e|notice|thirdparty)/i.test(file.name)).map(file => file.name).sort()
  for (const filename of files) notices += `\n${filename}\n${await readFile(path.join(directory, filename), 'utf8')}\n`
  if (!files.length) notices += '\nThe published package declares the license above and supplies no separate license text.\n'
}
await writeFile(path.join(staging, 'THIRD_PARTY_NOTICES.txt'), notices)
const script = `import pathlib, sys, zipfile
source=pathlib.Path(sys.argv[1])
with zipfile.ZipFile(sys.argv[2], 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for file in sorted(source.rglob('*')):
        if not file.is_file(): continue
        relative=file.relative_to(source.parent).as_posix()
        info=zipfile.ZipInfo(relative, (2020,1,1,0,0,0))
        info.compress_type=zipfile.ZIP_DEFLATED
        info.external_attr=0o100644 << 16
        archive.writestr(info, file.read_bytes())
`
const result = spawnSync('python3', ['-c', script, staging, archive], { encoding: 'utf8' })
if (result.status !== 0) throw new Error('Release packaging needs Python 3. The prepared staging directory was preserved.')
const hash = createHash('sha256').update(await readFile(archive)).digest('hex')
await writeFile(path.join(output, `${name}.sha256`), `${hash}  ${name}.zip\n`)
await rm(staging, {recursive:true})
console.log(`${name}.zip\nSHA-256 ${hash}`)
