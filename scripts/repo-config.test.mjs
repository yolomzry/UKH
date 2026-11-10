// Guards the settings that keep every team member's computer in step.
// If one of these tests fails, a shared settings file was changed by accident
// (or on purpose, and then this test and docs/decisions.md must change with it).

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { parsePackageManagerPin, satisfiesRange } from './lib/tool-rules.mjs';

const projectPath = join(dirname(fileURLToPath(import.meta.url)), '..');
// Windows editors sometimes save lines ending in CRLF. Reading them as LF keeps
// the checks below about the content, not about invisible characters.
const read = (name) => readFileSync(join(projectPath, name), 'utf8').replace(/\r\n/g, '\n');
const manifest = JSON.parse(read('package.json'));

test('package.json is private and pins one exact pnpm version', () => {
  assert.equal(manifest.private, true, 'the root project must never be published');
  const pin = parsePackageManagerPin(manifest.packageManager);
  assert.notEqual(pin, null, '"packageManager" should look like "pnpm@11.28.11"');
  assert.equal(pin.name, 'pnpm');
});

test('.nvmrc and package.json agree on the Node.js version', () => {
  const major = Number(read('.nvmrc').trim().replace(/^v/, '').split('.')[0]);
  assert.ok(Number.isInteger(major) && major > 0, '.nvmrc should hold a Node.js major version such as 24');

  const range = manifest.engines.node;
  assert.equal(satisfiesRange(`${major}.999.0`, range), true, `Node.js ${major} should satisfy "${range}"`);
  assert.equal(satisfiesRange(`${major + 1}.0.0`, range), false, `Node.js ${major + 1} should not satisfy "${range}"`);
  assert.equal(satisfiesRange(`${major - 1}.999.0`, range), false, `Node.js ${major - 1} should not satisfy "${range}"`);
});

test('"npm install" stays blocked on purpose', () => {
  assert.equal(manifest.engines.npm, 'please-use-pnpm');
  assert.match(read('.npmrc'), /^engine-strict=true$/m);
});

test('pnpm-workspace.yaml lists the apps and packages folders', () => {
  const workspace = read('pnpm-workspace.yaml');
  assert.match(workspace, /^packages:$/m);
  assert.match(workspace, /^ {2}- "apps\/\*"$/m);
  assert.match(workspace, /^ {2}- "packages\/\*"$/m);
});

test('the files that keep the team consistent exist', () => {
  for (const name of ['.gitignore', '.gitattributes', '.editorconfig', 'README.md', 'docs/decisions.md']) {
    assert.ok(existsSync(join(projectPath, name)), `${name} is missing`);
  }
});

test('no lockfile from another package manager is lying around', () => {
  const foreignLockfiles = ['package-lock.json', 'yarn.lock', 'bun.lock', 'bun.lockb'];

  // Look in the project root and in every project folder under apps/ and packages/.
  const folders = [projectPath];
  for (const group of ['apps', 'packages']) {
    const groupPath = join(projectPath, group);
    if (!existsSync(groupPath)) continue;
    for (const entry of readdirSync(groupPath, { withFileTypes: true })) {
      if (entry.isDirectory()) folders.push(join(groupPath, entry.name));
    }
  }

  for (const folder of folders) {
    for (const name of foreignLockfiles) {
      assert.equal(
        existsSync(join(folder, name)),
        false,
        `${join(folder, name)} exists. Someone ran npm, yarn or bun here. ` +
          'Delete that file and the node_modules folder next to it, then run "pnpm install".',
      );
    }
  }
});
