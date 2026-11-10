// Runs the real tool check once, the same way a person does, and makes sure the
// program holds together: it prints a report, and its exit code agrees with it.
//
// Whether the check says READY or NOT READY depends on the computer, so this
// test accepts both. The rules themselves are tested in lib/tool-rules.test.mjs.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = join(dirname(fileURLToPath(import.meta.url)), 'check-tools.mjs');

test('the tool check runs, prints a report, and its exit code matches the report', () => {
  const run = spawnSync(process.execPath, [script], { encoding: 'utf8' });

  assert.equal(run.error, undefined, 'the script should start');
  assert.match(run.stdout, /Car Care Platform: tool check/);
  assert.match(run.stdout, /^ {2}(OK {2}|FAIL) {2}Node\.js /m);
  assert.match(run.stdout, /^Result: /m);

  const reportsFailure = /^ {2}FAIL {2}/m.test(run.stdout);
  assert.equal(run.status, reportsFailure ? 1 : 0);
  assert.equal(/Result: NOT READY/.test(run.stdout), reportsFailure);
});
