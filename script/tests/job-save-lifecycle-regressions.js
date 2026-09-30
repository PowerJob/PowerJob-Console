// Exercises actual component methods with a deferred transport; browser checks are separate.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = process.argv[2] || path.resolve(__dirname, '../..');
function instance() {
  const source = fs.readFileSync(path.join(root, 'src/components/views/JobManager.vue'), 'utf8');
  let script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
  const context = { window: { localStorage: { getItem: () => '1' } }, console, result: undefined };
  script = script.replace(/import\s+(\w+)\s+from[^;]+;/g, (_, name) => { context[name] = {}; return ''; }).replace('export default', 'result =');
  vm.runInNewContext(script, context);
  const state = { $t: key => key, $message: { success() {} } };
  Object.assign(state, context.result.data.call(state));
  Object.keys(context.result.methods).forEach(key => state[key] = context.result.methods[key].bind(state));
  let resolve, reject;
  const requests = [];
  state.axios = { post(url, body) {
    const response = new Promise((done, failed) => { resolve = done; reject = failed; });
    requests.push({ url, body }); return response;
  }, get(url) { requests.push({ url }); return Promise.resolve(); } };
  let refreshed = 0; state.listJobInfos = () => { refreshed++; };
  return { state, requests, resolve: () => resolve(), reject: () => reject(new Error('planned save failure')), refreshed: () => refreshed };
}
function plain(value) { return JSON.parse(JSON.stringify(value)); }
function form(lifeCycle) {
  return { id: 292, appId: 1, jobName: 'copy', enable: false, lifeCycle,
    alarmConfig: { alertThreshold: 2, statisticWindowLen: 0, silenceWindowLen: 4 },
    jobParams: 'Unicode甲', processorInfo: 'fixture', extra: 'keep', advancedRuntimeConfig: {}, customFutureField: { untouched: true } };
}
const tests = [
  ['inflight bounded dates remain editable while request uses DTO', async () => {
    const h = instance(); const dates = [1790985600000, 1791590400000];
    h.state.modifiedJobForm = form(dates); h.state.modifiedJobFormVisible = true;
    const saving = h.state.saveJob();
    assert.strictEqual(h.requests.length, 1); assert.strictEqual(h.requests[0].url, '/job/save');
    assert.deepStrictEqual(plain(h.requests[0].body.lifeCycle), { start: dates[0], end: dates[1] });
    assert.strictEqual(h.state.modifiedJobForm.lifeCycle, dates);
    assert.notStrictEqual(h.requests[0].body, h.state.modifiedJobForm);
    assert.strictEqual(h.state.modifiedJobFormVisible, true);
    assert.strictEqual(h.requests[0].body.jobParams, 'Unicode甲');
    assert.deepStrictEqual(plain(h.requests[0].body.customFutureField), { untouched: true });
    h.resolve(); await saving;
    assert.strictEqual(h.state.modifiedJobForm.lifeCycle, dates);
    assert.strictEqual(h.state.modifiedJobFormVisible, false); assert.strictEqual(h.refreshed(), 1);
  }],
  ['failed bounded save keeps original form and date range', async () => {
    const h = instance(); const dates = [1790985600000, 1791590400000]; const original = form(dates);
    h.state.modifiedJobForm = original; h.state.modifiedJobFormVisible = true;
    const saving = h.state.saveJob(); h.reject(); await assert.rejects(saving, /planned save failure/);
    assert.strictEqual(h.state.modifiedJobForm, original); assert.strictEqual(h.state.modifiedJobForm.lifeCycle, dates);
    assert.strictEqual(h.state.modifiedJobFormVisible, true); assert.strictEqual(h.refreshed(), 0);
  }],
  ['unbounded null lifecycle is sent unchanged', async () => {
    const h = instance(); h.state.modifiedJobForm = form(null);
    const saving = h.state.saveJob(); assert.strictEqual(h.requests[0].body.lifeCycle, null);
    assert.strictEqual(h.state.modifiedJobForm.lifeCycle, null); h.resolve(); await saving;
  }],
  ['enable existing object lifecycle preserves row and request fields', async () => {
    const h = instance(); const cycle = { start: 1790985600000, end: 1791590400000 }; const row = form(cycle); row.enable = true;
    h.state.changeJobStatus(row);
    assert.strictEqual(h.requests.length, 1); assert.strictEqual(h.requests[0].url, '/job/save');
    assert.strictEqual(h.requests[0].body.enable, true); assert.deepStrictEqual(plain(h.requests[0].body.lifeCycle), cycle);
    assert.strictEqual(row.lifeCycle, cycle); h.resolve(); await new Promise(resolve => setImmediate(resolve));
    assert.strictEqual(h.refreshed(), 1);
  }],
  ['disable continues to use original endpoint without saving dates', async () => {
    const h = instance(); const row = form([1790985600000, 1791590400000]);
    h.state.changeJobStatus(row); await Promise.resolve();
    assert.deepStrictEqual(h.requests, [{ url: '/job/disable?jobId=292' }]); assert.strictEqual(h.refreshed(), 1);
    assert.ok(Array.isArray(row.lifeCycle));
  }],
  ['existing alarm default zero and nonzero fields retain contract', async () => {
    const h = instance(); h.state.modifiedJobForm = form(null);
    h.state.modifiedJobForm.alarmConfig = { alertThreshold: undefined, statisticWindowLen: 0, silenceWindowLen: 4 };
    const saving = h.state.saveJob();
    assert.deepStrictEqual(plain(h.requests[0].body.alarmConfig), { alertThreshold: 0, statisticWindowLen: 0, silenceWindowLen: 4 });
    assert.deepStrictEqual(plain(h.state.modifiedJobForm.alarmConfig), { alertThreshold: 0, statisticWindowLen: 0, silenceWindowLen: 4 });
    h.resolve(); await saving;
  }],
];
(async () => {
  const results = [];
  for (const [name, test] of tests) {
    try { await test(); results.push({ name, status: 'PASS' }); }
    catch (error) { results.push({ name, status: 'FAIL', error: error.message }); }
  }
  console.log(JSON.stringify({ tests: results.length, failures: results.filter(v => v.status === 'FAIL').length, results }, null, 2));
  if (results.some(v => v.status === 'FAIL')) process.exitCode = 1;
})();
