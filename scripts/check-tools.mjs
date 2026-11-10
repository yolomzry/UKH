// Checks that this computer is ready to work on the project.
//
// Run it from the project folder:
//
//     node scripts/check-tools.mjs      works even before pnpm is installed
//     pnpm check:tools                  the same check, once pnpm is installed
//
// The script only reads information. It never changes anything on the computer.
// It uses no libraries, so it works before "pnpm install".
//
// This file collects the facts (which versions are installed). The decisions
// about what is good or bad live in lib/tool-rules.mjs.

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  exitCodeFor,
  findVersionIn,
  formatReport,
  judge,
  parsePackageManagerPin,
} from './lib/tool-rules.mjs';

const projectPath = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(projectPath, 'package.json'), 'utf8'));

/** Run a command and capture what it prints. Never throws. */
function run(command, timeoutMs) {
  try {
    const text = execSync(command, {
      cwd: projectPath,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs,
      windowsHide: true,
    });
    return { ok: true, text: text.trim() };
  } catch (error) {
    // A failed program may explain itself on either of its two output channels,
    // so keep both. Fall back to the system's own message (for example
    // "command not found") when the program printed nothing.
    const printed = [error?.stdout, error?.stderr].filter(Boolean).join('\n').trim();
    return { ok: false, text: printed || String(error?.message ?? '').trim() };
  }
}

/** The first two lines of a message that have something in them, cut to a readable length. */
function shortSummary(text) {
  const lines = String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.slice(0, 2).join(' / ').replace(/\s+/g, ' ').slice(0, 300);
}

function detectPnpm() {
  // When this script is started through "pnpm check:tools", pnpm passes its own
  // version along in this variable. That is the most reliable answer.
  const agent = process.env.npm_config_user_agent ?? '';
  const fromAgent = /^pnpm\/(\d+\.\d+\.\d+)/.exec(agent);
  if (fromAgent) return { version: fromAgent[1], problem: '' };

  // Otherwise ask pnpm. The first time, pnpm may download the pinned version,
  // so this can take a while on a slow connection.
  const answer = run('pnpm --version', 180_000);
  const version = answer.ok ? findVersionIn(answer.text) : null;
  return { version, problem: version ? '' : shortSummary(answer.text) };
}

function collectFacts() {
  const pnpm = detectPnpm();
  const git = run('git --version', 15_000);
  const pin = parsePackageManagerPin(manifest.packageManager);

  return {
    nodeVersion: process.versions.node,
    requiredNodeRange: manifest.engines?.node ?? '',
    pnpmVersion: pnpm.version,
    pnpmProblem: pnpm.problem,
    pinnedPnpmVersion: pin && pin.name === 'pnpm' ? pin.version : '',
    gitVersion: git.ok ? findVersionIn(git.text) : null,
    gitUserName: git.ok ? run('git config user.name', 15_000).text : '',
    gitUserEmail: git.ok ? run('git config user.email', 15_000).text : '',
    projectPath,
  };
}

console.log('Checking the tools on this computer. The first run can take a minute...');

const results = judge(collectFacts());
console.log(formatReport(results, `${process.platform} ${process.arch}`));
process.exitCode = exitCodeFor(results);
