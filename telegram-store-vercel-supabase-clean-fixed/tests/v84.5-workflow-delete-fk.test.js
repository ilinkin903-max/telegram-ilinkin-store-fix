const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('delete workflow removes restricted child run journal before runs and parent', () => {
  const db = read('lib/db.js');
  const fnStart = db.indexOf('async function deleteResellerWorkflow');
  const fnEnd = db.indexOf('async function listResellerWorkflowSteps', fnStart);
  const fn = db.slice(fnStart, fnEnd);

  const journal = fn.indexOf("table: 'reseller_workflow_run_steps'");
  const runs = fn.indexOf("table: 'reseller_workflow_runs'");
  const parent = fn.indexOf("from('reseller_workflows')");

  assert.ok(journal > -1);
  assert.ok(runs > -1);
  assert.ok(parent > -1);
  assert.ok(journal < runs);
  assert.ok(runs < parent);
  assert.match(fn, /!isMissingTableError\(error\)/);
});

test('workflow delete endpoint returns safe conflict on database failure', () => {
  const api = read('api/reseller-data.js');
  const start = api.indexOf("if (action === 'workflow-delete')");
  const end = api.indexOf("if (action === 'workflow-retry-order')", start);
  const block = api.slice(start, end);

  assert.match(block, /try \{/);
  assert.match(block, /await db\.deleteResellerWorkflow\(workflow\.id\)/);
  assert.match(block, /Workflow belum dapat dihapus/);
  assert.doesNotMatch(block, /reseller_workflow_runs_workflow_id_fkey/);
});

test('schema uses cascade for steps and restrict for run history while code cleans restricted history first', () => {
  const schema = read('supabase/schema.sql');
  assert.ok(schema.includes('workflow_id uuid not null references public.reseller_workflows(id) on delete cascade'));
  assert.ok(schema.includes('workflow_id uuid not null references public.reseller_workflows(id) on delete restrict'));
});
