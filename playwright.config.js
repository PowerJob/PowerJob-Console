import { defineConfig } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const credentialPath = process.env.POWERJOB_E2E_CREDENTIALS
const credentials = credentialPath && fs.existsSync(credentialPath) ? JSON.parse(fs.readFileSync(credentialPath, 'utf8')) : {}
const output = path.resolve(process.env.POWERJOB_E2E_OUTPUT || 'test-results/e2e')
const port = Number(process.env.POWERJOB_E2E_PORT || 5173)
const shellQuote = value => `'${value.replaceAll("'", "'\\''")}'`

export default defineConfig({
  testDir: './test/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: path.join(output, 'artifacts'),
  reporter: [['line'], ['json', { outputFile: path.join(output, 'results.json') }], ['html', { outputFolder: path.join(output, 'html'), open: 'never' }]],
  use: {
    baseURL: process.env.POWERJOB_E2E_BASE_URL || `http://127.0.0.1:${port}`,
    viewport: { width: 1440, height: 1000 },
    locale: 'en-US',
    timezoneId: 'Asia/Shanghai',
    actionTimeout: 15_000,
    // Authenticated traces/HAR can contain credentials; retain redacted screenshots only.
    trace: 'off', video: 'off', screenshot: 'off',
    launchOptions: process.env.POWERJOB_E2E_CHROME ? { executablePath: process.env.POWERJOB_E2E_CHROME } : {},
  },
  webServer: process.env.POWERJOB_E2E_BASE_URL ? undefined : {
    command: `${shellQuote(process.execPath)} node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore', stderr: 'ignore',
    env: { POWERJOB_DEV_SERVER: process.env.POWERJOB_E2E_SERVER || credentials.server_urls?.[0] || 'http://127.0.0.1:7700' },
  },
})
