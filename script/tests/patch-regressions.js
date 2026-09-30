// Dependency-free request/response regressions; browser acceptance is a separate step.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const sourceRoot = process.argv[2] || path.resolve(__dirname, '../..');

function component(file, props = {}) {
  const source = fs.readFileSync(path.join(sourceRoot, 'src/components', file), 'utf8');
  let script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
  const context = { window: { localStorage: { getItem: () => '1' } }, console,
    result: undefined };
  script = script.replace(/import\s+(\w+)\s+from[^;]+;/g, (_, name) => {
    context[name] = {}; return '';
  }).replace('export default', 'result =');
  vm.runInNewContext(script, context, { filename: file });
  const definition = context.result;
  const instance = Object.assign({ $t: value => value, $message: { error() {} }, $emit() {} }, props);
  Object.assign(instance, definition.data.call(instance));
  Object.keys(definition.methods).forEach(name => instance[name] = definition.methods[name].bind(instance));
  return { instance, definition };
}

function deferredRequests(instance) {
  const requests = [];
  instance.axios = { post(url, body) {
    let resolve; const promise = new Promise(done => resolve = done);
    requests.push({ url, body, resolve }); return promise;
  } };
  return requests;
}

async function run() {
  const detail = component('common/InstanceDetail.vue', { instanceId: 101 });
  const requests = deferredRequests(detail.instance);
  detail.instance.fetchInstanceDetail();
  for (const iid of [102, 101]) {
    detail.instance.instanceId = iid;
    detail.definition.watch.instanceId.call(detail.instance, iid);
  }
  assert.deepStrictEqual(requests.map(r => r.body.instanceId), [101, 102, 101]);
  requests[2].resolve({ result: 'latest A', queriedTaskDetailInfoList: [] });
  await Promise.resolve();
  requests[0].resolve({ result: 'old A' }); requests[1].resolve({ result: 'old B' });
  await Promise.resolve();
  assert.strictEqual(detail.instance.instanceDetail.result, 'latest A');

  for (const [file, query, list, result] of [
    ['views/JobManager.vue', 'jobQueryContent', 'listJobInfos', 'jobInfoPageResult'],
    ['views/WorkflowManager.vue', 'workflowQueryContent', 'listWorkflow', 'workflowPageResult']
  ]) {
    const { instance } = component(file); const calls = deferredRequests(instance);
    instance[query].index = 9; instance[list]();
    instance[query].keyword = 'new filter'; instance.onClickQuery();
    assert.strictEqual(calls[0].body.index, 9);
    assert.strictEqual(calls[1].body.index, 0);
    calls[1].resolve({ data: [], totalItems: 1 }); await Promise.resolve();
    calls[0].resolve({ data: [], totalItems: 99 }); await Promise.resolve();
    assert.strictEqual(instance[result].totalItems, 1);
    instance.onClickChangePage(3); assert.strictEqual(calls[2].body.index, 2);
    instance.runParameter = 'stale'; instance.temporaryRowData = { id: 1 };
    instance.onClickRunCancel();
    assert.strictEqual(instance.runParameter, null); assert.strictEqual(instance.temporaryRowData, null);
  }

  const daily = component('common/DailyTimeIntervalForm.vue');
  for (const input of [undefined, null, '', '0 0 8 * * ?']) {
    daily.instance.loadExpression(input); assert.strictEqual(daily.instance.parseError, false);
    assert.strictEqual(daily.instance.dailyTimeIntervalExpress.intervalUnit, 'SECONDS');
  }
  daily.instance.loadExpression('{"interval":2,"intervalUnit":"MINUTES"}');
  assert.strictEqual(daily.instance.dailyTimeIntervalExpress.intervalUnit, 'MINUTES');
  assert.strictEqual(daily.instance.dailyTimeIntervalExpress.daysOfWeek.length, 0);
  let emitted = 0; daily.instance.$emit = () => emitted++;
  daily.instance.loadExpression('{"daysOfWeek":"invalid"}');
  assert.strictEqual(daily.instance.parseError, true);
  assert.ok(Array.isArray(daily.instance.dailyTimeIntervalExpress.daysOfWeek));
  daily.instance.loadExpression('{broken'); daily.instance.onSubmit();
  assert.strictEqual(daily.instance.parseError, true); assert.strictEqual(emitted, 0);
  daily.instance.loadExpression(null); daily.instance.onSubmit(); assert.strictEqual(emitted, 1);

  const editor = component('dag/JSEditor.vue', { code: 'new code' });
  let value = 'old code'; let writes = 0;
  editor.instance.onMounted({ getValue: () => value, setValue: next => { value = next; writes++; } });
  assert.strictEqual(value, 'new code');
  editor.definition.watch.code.call(editor.instance, 'new code'); assert.strictEqual(writes, 1);
  editor.definition.watch.code.call(editor.instance, ''); assert.strictEqual(value, '');
  console.log('PASS: instance route/race, filter/page/race, cancel state, DAILY parse/save, editor props');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
