import { defineConfig } from '@playwright/test'
import path from 'node:path'
const output=process.env.POWERJOB_E2E_OUTPUT||path.resolve('../e2e-default')
export default defineConfig({testDir:'./tests/e2e',fullyParallel:false,workers:1,retries:0,timeout:180000,expect:{timeout:15000},outputDir:path.join(output,'artifacts'),reporter:[['line'],['json',{outputFile:path.join(output,'results.json')}],['html',{outputFolder:path.join(output,'html'),open:'never'}]],use:{baseURL:process.env.POWERJOB_E2E_BASE_URL||'http://127.0.0.1:5197',viewport:{width:1440,height:900},timezoneId:'Asia/Shanghai',locale:'en-US',trace:'off',screenshot:'off',launchOptions:{executablePath:process.env.POWERJOB_E2E_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}}})
