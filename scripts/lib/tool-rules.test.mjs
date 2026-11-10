// Tests for the rules of the tool check.
// Run them with:  pnpm test

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  compareVersions,
  exitCodeFor,
  findVersionIn,
  formatReport,
  judge,
  parsePackageManagerPin,
  parseVersion,
  satisfiesRange,
} from './tool-rules.mjs';

/** A computer where everything is right. Each test changes one thing. */
const goodFacts = {
  nodeVersion: '24.22.1',
  requiredNodeRange: '>=24.11.0 <25',
  pnpmVersion: '11.28.11',
  pnpmProblem: '',
  pinnedPnpmVersion: '11.28.11',
  gitVersion: '2.47.0',
  gitUserName: 'Test Person',
  gitUserEmail: 'test@example.com',
  projectPath: '/home/test/dev/carcare-platform',
};

/** Find the result whose title contains the given word. */
const resultAbout = (results, word) => results.find((result) => result.title.includes(word));

describe('version helpers', () => {
  test('parseVersion reads full, short and v-prefixed versions', () => {
    assert.deepEqual(parseVersion('24.11.0'), [24, 11, 0]);
    assert.deepEqual(parseVersion('v24.22.1'), [24, 22, 1]);
    assert.deepEqual(parseVersion('24.11'), [24, 11, 0]);
    assert.deepEqual(parseVersion('25'), [25, 0, 0]);
  });

  test('parseVersion returns null for text that is not a version', () => {
    assert.equal(parseVersion('banana'), null);
    assert.equal(parseVersion(''), null);
    assert.equal(parseVersion(null), null);
    assert.equal(parseVersion(undefined), null);
  });

  test('findVersionIn pulls a version out of a longer text', () => {
    assert.equal(findVersionIn('git version 2.47.0.windows.1'), '2.47.0');
    assert.equal(findVersionIn('git version 2.43.0'), '2.43.0');
    assert.equal(findVersionIn('command not found'), null);
  });

  test('compareVersions orders versions by number, not by text', () => {
    assert.equal(compareVersions([24, 9, 0], [24, 11, 0]), -1);
    assert.equal(compareVersions([24, 11, 0], [24, 11, 0]), 0);
    assert.equal(compareVersions([25, 0, 0], [24, 99, 99]), 1);
  });

  test('parsePackageManagerPin reads the packageManager line', () => {
    assert.deepEqual(parsePackageManagerPin('pnpm@11.28.11'), { name: 'pnpm', version: '11.28.11' });
    assert.deepEqual(parsePackageManagerPin('pnpm@11.28.11+sha512.abc123'), {
      name: 'pnpm',
      version: '11.28.11',
    });
    assert.equal(parsePackageManagerPin('pnpm'), null);
    assert.equal(parsePackageManagerPin(undefined), null);
  });
});

describe('satisfiesRange', () => {
  const range = '>=24.11.0 <25';

  test('accepts versions inside the range', () => {
    assert.equal(satisfiesRange('24.11.0', range), true);
    assert.equal(satisfiesRange('24.22.1', range), true);
    assert.equal(satisfiesRange('v24.22.1', range), true);
  });

  test('rejects versions outside the range', () => {
    assert.equal(satisfiesRange('24.10.9', range), false);
    assert.equal(satisfiesRange('22.23.4', range), false);
    assert.equal(satisfiesRange('25.0.0', range), false);
    assert.equal(satisfiesRange('26.12.0', range), false);
  });

  test('understands every operator', () => {
    assert.equal(satisfiesRange('2.0.0', '>1.9.9'), true);
    assert.equal(satisfiesRange('2.0.0', '>2.0.0'), false);
    assert.equal(satisfiesRange('2.0.0', '<=2.0.0'), true);
    assert.equal(satisfiesRange('2.0.1', '<=2.0.0'), false);
    assert.equal(satisfiesRange('2.0.0', '=2.0.0'), true);
    assert.equal(satisfiesRange('2.0.0', '2.0.0'), true);
    assert.equal(satisfiesRange('2.0.1', '2.0.0'), false);
  });

  test('treats anything it does not understand as "not satisfied"', () => {
    assert.equal(satisfiesRange('24.11.0', '^24.0.0'), false);
    assert.equal(satisfiesRange('24.11.0', '24.x'), false);
    assert.equal(satisfiesRange('24.11.0', '>=24 || >=26'), false);
    assert.equal(satisfiesRange('24.11.0', ''), false);
    assert.equal(satisfiesRange('not a version', range), false);
  });
});

describe('judge', () => {
  test('a correctly set up computer passes every check', () => {
    const results = judge(goodFacts);
    assert.equal(results.length, 5);
    assert.deepEqual(results.map((result) => result.level), ['ok', 'ok', 'ok', 'ok', 'ok']);
    assert.equal(exitCodeFor(results), 0);
  });

  for (const nodeVersion of ['22.23.4', '24.10.0', '25.9.0', '26.12.0']) {
    test(`Node.js ${nodeVersion} is rejected`, () => {
      const results = judge({ ...goodFacts, nodeVersion });
      const node = resultAbout(results, 'Node.js');
      assert.equal(node.level, 'fail');
      assert.match(node.fix.join(' '), /Install Node\.js 24 /);
      assert.equal(exitCodeFor(results), 1);
    });
  }

  test('missing pnpm fails and shows the install command', () => {
    const results = judge({
      ...goodFacts,
      pnpmVersion: null,
      pnpmProblem: "'pnpm' is not recognized as an internal or external command",
    });
    const pnpm = resultAbout(results, 'pnpm');
    assert.equal(pnpm.level, 'fail');
    assert.match(pnpm.detail, /not recognized/);
    assert.equal(pnpm.fix[0], 'npm install -g pnpm@11');
    assert.equal(exitCodeFor(results), 1);
  });

  test('a download problem points at the internet connection, not at reinstalling', () => {
    const results = judge({
      ...goodFacts,
      pnpmVersion: null,
      pnpmProblem: 'ERR_PNPM_META_FETCH_FAIL GET https://registry.npmjs.org/pnpm: getaddrinfo ENOTFOUND',
    });
    const pnpm = resultAbout(results, 'pnpm');
    assert.equal(pnpm.level, 'fail');
    assert.match(pnpm.fix[0], /internet connection/);
    assert.match(pnpm.fix[0], /11\.28\.11/);
  });

  test('pnpm 9 is too old', () => {
    const results = judge({ ...goodFacts, pnpmVersion: '9.15.9' });
    assert.equal(resultAbout(results, 'pnpm').level, 'fail');
    assert.equal(exitCodeFor(results), 1);
  });

  for (const pnpmVersion of ['10.28.0', '12.18.0']) {
    test(`pnpm ${pnpmVersion} gives a warning, because it can switch to the pinned version`, () => {
      const results = judge({ ...goodFacts, pnpmVersion });
      const pnpm = resultAbout(results, 'pnpm');
      assert.equal(pnpm.level, 'warn');
      assert.equal(pnpm.fix[0], 'npm install -g pnpm@11');
      assert.equal(exitCodeFor(results), 0);
    });
  }

  test('another pnpm 11 version is accepted', () => {
    const results = judge({ ...goodFacts, pnpmVersion: '11.20.0' });
    const pnpm = resultAbout(results, 'pnpm');
    assert.equal(pnpm.level, 'ok');
    assert.match(pnpm.detail, /pins 11\.28\.11/);
  });

  test('a broken packageManager line in package.json fails', () => {
    const results = judge({ ...goodFacts, pinnedPnpmVersion: '' });
    assert.equal(resultAbout(results, 'package.json').level, 'fail');
  });

  test('missing Git fails, and the name and email check is skipped', () => {
    const results = judge({ ...goodFacts, gitVersion: null, gitUserName: '', gitUserEmail: '' });
    assert.equal(resultAbout(results, 'Git was not found').level, 'fail');
    assert.equal(results.length, 4);
    assert.equal(exitCodeFor(results), 1);
  });

  test('an old Git gives a warning', () => {
    const results = judge({ ...goodFacts, gitVersion: '2.20.1' });
    assert.equal(resultAbout(results, 'Git 2.20.1').level, 'warn');
    assert.equal(exitCodeFor(results), 0);
  });

  test('a missing Git name or email gives a warning with the two commands', () => {
    const results = judge({ ...goodFacts, gitUserEmail: '' });
    const identity = resultAbout(results, 'name or email');
    assert.equal(identity.level, 'warn');
    assert.equal(identity.fix.length, 2);
    assert.equal(exitCodeFor(results), 0);
  });

  test('the report never prints the name or the email itself', () => {
    const report = formatReport(judge(goodFacts), 'linux x64');
    assert.equal(report.includes('Test Person'), false);
    assert.equal(report.includes('test@example.com'), false);
  });

  const riskyPaths = {
    'a space': 'C:\\Users\\Test Person\\carcare-platform',
    'non-English characters': '/home/test/پڕۆژە/carcare-platform',
    'a cloud-sync folder': 'C:\\Users\\test\\OneDrive\\carcare-platform',
    'an iCloud folder': '/Users/test/Library/Mobile Documents/carcare-platform',
  };
  for (const [name, projectPath] of Object.entries(riskyPaths)) {
    test(`a project path with ${name} gives a warning`, () => {
      const results = judge({ ...goodFacts, projectPath });
      assert.equal(resultAbout(results, 'project folder').level, 'warn');
      assert.equal(exitCodeFor(results), 0);
    });
  }
});

describe('formatReport', () => {
  test('says READY when everything passes', () => {
    const report = formatReport(judge(goodFacts), 'linux x64');
    assert.match(report, /Car Care Platform: tool check/);
    assert.match(report, /System: linux x64/);
    assert.match(report, /^ {2}OK {4}Node\.js 24\.22\.1$/m);
    assert.match(report, /Result: READY\. All checks passed\./);
  });

  test('says READY with warnings when there are only warnings', () => {
    const report = formatReport(judge({ ...goodFacts, gitUserName: '' }), 'darwin arm64');
    assert.match(report, /^ {2}WARN {2}Git does not know your name or email yet$/m);
    assert.match(report, /^ {8}Fix: git config --global user\.name "Your Name"$/m);
    assert.match(report, /^ {8} {5}git config --global user\.email "you@example\.com"$/m);
    assert.match(report, /Result: READY, with warnings\./);
  });

  test('says NOT READY when something fails', () => {
    const report = formatReport(judge({ ...goodFacts, nodeVersion: '22.23.4' }), 'win32 x64');
    assert.match(report, /^ {2}FAIL {2}Node\.js 22\.23\.4 is not a version this project can use$/m);
    assert.match(report, /Result: NOT READY\./);
  });
});
