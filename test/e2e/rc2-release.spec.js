import { test, expect, selectors, runId, demoProcessor, input, choose, enterSamples, saveDialog, clickAndResponse, login, fileHash } from './support.js'
import fs from 'node:fs/promises'
import path from 'node:path'

test('rc.2 release · roll back to rc.1 and read new task/workflow/execution/log, then restore', async ({ page, backend, credentials }, info) => {
  test.skip(!process.env.POWERJOB_E2E_ROLLBACK_STATE || !process.env.POWERJOB_E2E_OLD_DIST, 'An independent static server and preserved rc.1 package are required')
  test.setTimeout(180_000)
  const stateFile = process.env.POWERJOB_E2E_ROLLBACK_STATE
  const original = await fs.readFile(stateFile, 'utf8'), state = JSON.parse(original)
  const oldDist = process.env.POWERJOB_E2E_OLD_DIST, name = runId + '_rc2_rollback'
  let jobId, workflowId
  const proof = { oldIndexSha256:await fileHash(path.join(oldDist,'index.html')), newIndexSha256:await fileHash(path.join(state.root,'index.html')) }
  try {
    await enterSamples(page, credentials)
    await page.goto('/#/oms/job'); await page.getByRole('button',{name:'New job',exact:true}).click()
    const dialog = selectors.dialog(page)
    await input(dialog,'Job name',name); await input(dialog,'Job params','success'); await input(dialog,'Execution config',demoProcessor)
    await choose(page,dialog,'Schedule info','API'); await saveDialog(page,'/job/save')
    jobId = (await backend.listJobs(name)).data.find(job => job.jobName === name).id
    await input(page.locator('main'),'Job ID',jobId); await page.getByRole('button',{name:'Query',exact:true}).click()
    const run = await clickAndResponse(page,'/job/run',()=>selectors.row(page,String(jobId)).getByRole('button',{name:'Run',exact:true}).click())
    expect(run.success).toBe(true); const instance = await backend.waitInstance(run.data,[5]); expect(instance.result).toContain('true')
    await page.goto('/#/oms/workflow'); await page.getByRole('button',{name:'New workflow',exact:true}).click()
    await input(page.locator('main'),'Workflow name',name+'_wf')
    await page.locator('.canvas-toolbar').getByRole('button',{name:/Import job/}).click()
    const drawer = page.locator('.el-drawer:visible'); await input(drawer,'Job ID',jobId)
    await clickAndResponse(page,'/job/list',()=>drawer.getByRole('button',{name:'Query',exact:true}).click())
    await clickAndResponse(page,'/workflow/saveNode',()=>selectors.row(page,String(jobId)).getByRole('button',{name:'Import',exact:true}).click())
    await expect(drawer).not.toBeVisible(); await expect(page.locator('.dag-node')).toHaveCount(1)
    const saved = await clickAndResponse(page,'/workflow/save',()=>page.locator('.editor-heading').getByRole('button',{name:'Save',exact:true}).click())
    expect(saved.success).toBe(true); workflowId = saved.data
    await fs.writeFile(stateFile,JSON.stringify({...state,root:oldDist}))
    // Reload the old application with the existing session, then actually log out.
    // Its login homepage redirects authenticated users, so it cannot be used as a
    // fresh-login fixture until Logout has cleared the current session.
    await page.goto('/#/admin/app'); await page.reload()
    await expect(page.locator('.account-button')).toBeVisible()
    await page.locator('.account-button').hover()
    await page.getByRole('menuitem',{name:'Logout',exact:true}).click()
    await expect(page).toHaveURL(/loginHomepage/)
    await login(page,credentials); await enterSamples(page,credentials)
    await page.goto('/#/oms/job'); await input(page.locator('main'),'Job ID',jobId); await page.getByRole('button',{name:'Query',exact:true}).click()
    await selectors.row(page,String(jobId)).getByRole('button',{name:'Edit',exact:true}).click()
    await expect(selectors.dialog(page).getByLabel('Job name',{exact:true})).toHaveValue(name)
    await selectors.dialog(page).getByRole('button',{name:'Cancel',exact:true}).click()
    await page.goto('/#/oms/workflowEditor?workflowId='+workflowId); await expect(page.locator('.dag-node')).toHaveCount(1)
    await expect(page.getByLabel('Workflow name',{exact:true})).toHaveValue(name+'_wf')
    await page.goto('/#/oms/instance?jobId='+jobId); await expect(selectors.row(page,String(run.data))).toContainText('Success')
    await expect(async()=>{
      await selectors.row(page,String(run.data)).getByRole('button',{name:'Log',exact:true}).click()
      const log = selectors.dialog(page), text = await log.locator('.log-output').textContent()
      await log.getByRole('button',{name:'Close this dialog'}).click()
      expect(text).toContain('StandaloneProcessorDemo finished process,success: true')
    }).toPass({timeout:30000,intervals:[1000,2000]})
    await selectors.row(page,String(run.data)).getByRole('button',{name:'Log',exact:true}).click()
    const downloading = page.waitForEvent('download')
    await selectors.dialog(page).getByRole('button',{name:'Download',exact:true}).click()
    const logFile = info.outputPath('rc1-rollback.log'); await (await downloading).saveAs(logFile)
    expect(await fs.readFile(logFile,'utf8')).toContain('StandaloneProcessorDemo finished process,success: true')
    await fs.writeFile(stateFile,original); await page.goto('/#/oms/instance?jobId='+jobId); await page.reload()
    await expect(selectors.row(page,String(run.data))).toContainText('Success'); await expect(page.locator('.nav-footer,.console-version')).toHaveCount(0)
    Object.assign(proof,{jobId:String(jobId),workflowId:String(workflowId),instanceId:String(run.data),status:instance.status,logSha256:await fileHash(logFile),oldPackageReadback:true,restoredNewPackage:true})
    await info.attach('rc2-rc1-rollback',{body:JSON.stringify(proof),contentType:'application/json'})
  } finally {
    await fs.writeFile(stateFile,original)
    if (workflowId) await backend.call('/workflow/delete?workflowId='+workflowId)
    if (jobId) await backend.deleteOwnedJob(jobId)
  }
})
