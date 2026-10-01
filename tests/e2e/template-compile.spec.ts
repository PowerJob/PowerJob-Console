import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn, execFileSync } from 'node:child_process'
import { test, expect, fill, enterSamples, ownedName, fileHash, observation, redact } from './helpers'
import { zipEntries, extractZip } from './zip-oracle'

test.use({ actionTimeout: 15_000 })

async function runMaven(binary: string, args: string[], cwd: string, javaHome: string, logFile: string, remainingMilliseconds: number) {
  if (remainingMilliseconds < 1000) throw new Error('Insufficient declared test time remains for independent compilation')
  const child = spawn(binary, args, { cwd, env: { ...process.env, JAVA_HOME: javaHome, PATH: path.join(javaHome, 'bin') + path.delimiter + (process.env.PATH || ''), MAVEN_OPTS: '-Xmx256m -Dhttps.protocols=TLSv1.2 -Djdk.tls.client.protocols=TLSv1.2', MAVEN_ARGS: '' }, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  child.stdout.on('data', chunk => { output += String(chunk) })
  child.stderr.on('data', chunk => { output += String(chunk) })
  const timedOut = setTimeout(() => child.kill('SIGTERM'), Math.min(90_000, remainingMilliseconds))
  try {
    const code = await new Promise<number | null>((resolve, reject) => { child.once('error', () => reject(new Error('The configured Maven executable could not start'))); child.once('close', resolve) })
    await fs.writeFile(logFile, String(redact(output)))
    expect(code, 'The actual Server-generated template must compile successfully with its declared Java version').toBe(0)
    expect(output).toContain('BUILD SUCCESS')
  } finally { clearTimeout(timedOut) }
}

for (const version of ['8', '11'] as const) test(`UI-026 · Java ${version} native generated Unicode template compiles independently to declared class version`, async ({ page, credentials, backend: _backend }, info) => {
  test.setTimeout(180_000)
  const compilationDeadline = Date.now() + 160_000
  const javaHome = process.env[version === '8' ? 'POWERJOB_E2E_JAVA8_HOME' : 'POWERJOB_E2E_JAVA11_HOME']
  const maven = process.env.POWERJOB_E2E_MAVEN
  const repository = process.env.POWERJOB_E2E_MAVEN_REPOSITORY
  if (!javaHome || !maven || !repository) throw new Error('BLOCKED: configure Java 8/11, Maven and the isolated reusable dependency repository')
  await fs.access(path.join(javaHome, 'bin', 'javap'))
  await fs.access(maven)
  await enterSamples(page, credentials)
  await page.goto('/#/oms/template')
  const packageName = version === '8' ? 'com.example._.处理器_$' : 'com.example.处理器_$'
  const values = { Group: 'com.example.native', Artifact: `native-java${version}`, Name: ownedName(`java${version}_template`), 'Package name': packageName }
  for (const [label, value] of Object.entries(values)) await fill(page, label, value)
  await page.getByLabel('Java Version', { exact: true }).selectOption(version)
  const waiting = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Generate & download', exact: true }).click()
  const archive = info.outputPath(`java-${version}-template.zip`)
  await (await waiting).saveAs(archive)
  expect((await fs.readFile(archive)).subarray(0, 2).toString()).toBe('PK')
  const entries = zipEntries(archive)
  expect(entries.every(entry => !path.posix.isAbsolute(entry) && !entry.split('/').includes('..'))).toBe(true)
  expect(entries.some(entry => entry.endsWith('/src/main/java/' + packageName.replaceAll('.', '/') + '/'))).toBe(true)
  expect(entries.some(entry => entry.endsWith('.java'))).toBe(false)
  const extraction = info.outputPath('independent-project')
  await fs.mkdir(extraction, { recursive: true })
  extractZip(archive, extraction)
  const pomEntry = entries.find(entry => entry === 'pom.xml' || entry.endsWith('/pom.xml'))
  expect(pomEntry).toBeTruthy()
  const project = path.dirname(path.join(extraction, pomEntry!))
  const pom = await fs.readFile(path.join(project, 'pom.xml'), 'utf8')
  expect(pom).toContain('<groupId>' + values.Group + '</groupId>')
  expect(pom).toContain('<artifactId>' + values.Artifact + '</artifactId>')
  expect(pom).toContain(values.Name)
  const settings = info.outputPath('anonymous-maven-settings.xml')
  await fs.writeFile(settings, '<?xml version="1.0" encoding="UTF-8"?><settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"><mirrors><mirror><id>anonymous-central</id><mirrorOf>*</mirrorOf><url>https://repo.maven.apache.org/maven2/</url></mirror></mirrors></settings>\n')
  const mavenLog = info.outputPath('independent-maven.log')
  const initialBuildLog = info.outputPath('original-empty-template-maven.log')
  // Both explicit settings files bypass the operator global settings and release credentials.
  await runMaven(maven, ['-B', '-ntp', '-gs', settings, '-s', settings, '-Dmaven.repo.local=' + repository, '-DskipTests', 'package'], project, javaHome, initialBuildLog, compilationDeadline - Date.now())
  // Inspect only the exact dependency coordinates declared by the original generated POM,
  // after its real package build has resolved those dependencies. No extra Maven plugin or POM rewrite is needed.
  const dependencies = JSON.parse(execFileSync('python3', ['-c', `import sys,json,pathlib,xml.etree.ElementTree as ET
r=ET.parse(sys.argv[1]).getroot();n={'m':'http://maven.apache.org/POM/4.0.0'}
p=r.find('m:properties',n);props={v.tag.split('}')[-1]:v.text for v in p} if p is not None else {}
out=[];marker=chr(36)+'{'
for d in r.findall('m:dependencies/m:dependency',n):
 v=[d.findtext('m:'+key,namespaces=n) for key in ['groupId','artifactId','version']]
 if not all(v):raise ValueError('A direct generated dependency coordinate is incomplete')
 v=[props.get(a[2:-1],a) if a.startswith(marker) and a.endswith('}') else a for a in v]
 if any(marker in a for a in v):raise ValueError('A generated dependency property is unresolved')
 out.append(str(pathlib.Path(sys.argv[2],*v[0].split('.'),v[1],v[2],v[1]+'-'+v[2]+'.jar')))
print(json.dumps(out))`, path.join(project, 'pom.xml'), repository], { encoding: 'utf8' })) as string[]
  let processorSDK = ''
  let processResultClass = ''
  let taskContextClass = ''
  for (const dependency of dependencies.filter(filename => /powerjob-worker[^/]*\.jar$/.test(filename))) {
    const dependencyEntries = zipEntries(dependency)
    const sdk = dependencyEntries.find(name => name.endsWith('/BasicProcessor.class'))
    if (sdk) {
      processorSDK = sdk.replace(/\//g, '.').replace(/BasicProcessor\.class$/, '')
      const results = dependencyEntries.filter(name => name.includes('/worker/') && name.endsWith('/ProcessResult.class'))
      const contexts = dependencyEntries.filter(name => name.includes('/worker/') && name.endsWith('/TaskContext.class'))
      expect(results).toHaveLength(1); expect(contexts).toHaveLength(1)
      processResultClass = results[0].replace(/\//g, '.').replace(/\.class$/, '')
      taskContextClass = contexts[0].replace(/\//g, '.').replace(/\.class$/, '')
      break
    }
  }
  expect(processorSDK).not.toBe('')
  const probe = path.join(project, 'src', 'main', 'java', ...packageName.split('.'), 'TemplateProbe.java')
  await fs.writeFile(probe, `package ${packageName};\nimport ${processorSDK}BasicProcessor;\nimport ${processResultClass};\nimport ${taskContextClass};\npublic final class TemplateProbe implements BasicProcessor {\n public ProcessResult process(TaskContext context) throws Exception { return new ProcessResult(true, "template-compile-中文"); }\n}\n`)
  await runMaven(maven, ['-B', '-ntp', '-gs', settings, '-s', settings, '-Dmaven.repo.local=' + repository, '-DskipTests', 'package'], project, javaHome, mavenLog, compilationDeadline - Date.now())
  const classesDirectory = path.join(project, 'target', 'classes', ...packageName.split('.'))
  const classes = (await fs.readdir(classesDirectory)).filter(name => name.endsWith('.class'))
  expect(classes.length).toBeGreaterThan(0)
  const classEvidence = []
  for (const name of classes) {
    const qualified = packageName + '.' + name.replace(/\.class$/, '')
    const output = execFileSync(path.join(javaHome, 'bin', 'javap'), ['-classpath', path.join(project, 'target', 'classes'), '-verbose', qualified], { encoding: 'utf8' })
    const major = /major version:\s*(\d+)/.exec(output)
    expect(Number(major?.[1])).toBe(version === '8' ? 52 : 55)
    classEvidence.push({ name: qualified, majorVersion: Number(major![1]), sha256: await fileHash(path.join(classesDirectory, name)) })
  }
  const jars = (await fs.readdir(path.join(project, 'target'))).filter(name => name.endsWith('.jar'))
  expect(jars.some(name => name.endsWith('jar-with-dependencies.jar'))).toBe(true)
  expect(await fs.readFile(path.join(project, 'pom.xml'), 'utf8')).toBe(pom)
  await observation(info, 'UI-026', `fev3-template-java${version}-independent-compile`, { originalServerGeneratedZIP: { sha256: await fileHash(archive), bytes: (await fs.stat(archive)).size }, actualFiveFields: { ...values, javaVersion: version }, originalTemplateContainsEmptySourceDirectoryNoJavaFiles: true, deterministicProcessorProbeAddedOnlyInExtractedTestProject: { sha256: await fileHash(probe), SDKPackageDerivedFromOriginalGeneratedPOMDependencies: processorSDK }, java8UnderscoreAllowedAndUnicodePackageActual: version === '8', actualMavenExitZeroAndBuildSuccessForBothOriginalEmptyTemplateAndProcessorProbe: true, originalGeneratedPOMUnchanged: true, clientTLSProtocol: 'TLSv1.2: environment workaround for JDK11.0.2 TLS resumption failure', anonymousSettingsSHA256: await fileHash(settings), originalEmptyTemplateMavenLogSHA256: await fileHash(initialBuildLog), originalMavenLogSHA256: await fileHash(mavenLog), actualClassVersionsAndBytes: classEvidence, actualPackagedJars: jars, templateHasNoPersistedDefinition: true, remoteTemporaryFiles: 'NOT_AUDITED_NO_EXACT_OWNERSHIP' })
})
