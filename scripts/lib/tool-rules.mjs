// The rules behind the tool check ("pnpm check:tools").
//
// Every function in this file is "pure": it only looks at the values it is
// given and returns an answer. Nothing in here reads files or runs programs.
// That makes the rules easy to test. The tests are in tool-rules.test.mjs.

/** The oldest pnpm that can switch by itself to the version this project pins. */
const OLDEST_PNPM_THAT_SWITCHES = 10;

/** The command "git init -b main" used in our guides needs at least this Git. */
const OLDEST_GOOD_GIT = '2.28.0';

// ---------------------------------------------------------------------------
// Part 1: small helpers for version numbers
// ---------------------------------------------------------------------------

/**
 * Turn text such as "v24.11.0", "24.11" or "25" into three numbers: [24, 11, 0].
 * Missing parts count as 0. Returns null when the text does not start with a version.
 */
export function parseVersion(text) {
  const match = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(String(text ?? '').trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

/**
 * Find the first version number inside a longer text.
 * Example: "git version 2.47.0.windows.1" gives "2.47.0". Returns null if there is none.
 */
export function findVersionIn(text) {
  const match = /\d+\.\d+(?:\.\d+)?/.exec(String(text ?? ''));
  return match ? match[0] : null;
}

/** Compare two parsed versions. Returns -1 (a is older), 0 (same) or 1 (a is newer). */
export function compareVersions(a, b) {
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return 0;
}

/**
 * Check a version against a simple range such as ">=24.11.0 <25".
 *
 * A range is one or more parts separated by spaces, and ALL parts must be true.
 * Each part is an operator (>=, >, <=, < or =) followed by a plain version.
 * This is a small subset of the "semver" rules. Anything it does not
 * understand (for example "^24.0.0" or "24.x") counts as "not satisfied",
 * so a typing mistake can never make a wrong version look acceptable.
 */
export function satisfiesRange(versionText, rangeText) {
  const version = parseVersion(versionText);
  if (!version) return false;

  const parts = String(rangeText ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return false;

  return parts.every((part) => {
    const match = /^(>=|<=|>|<|=)?(\d+(?:\.\d+){0,2})$/.exec(part);
    if (!match) return false;

    const order = compareVersions(version, parseVersion(match[2]));
    switch (match[1] ?? '=') {
      case '>=':
        return order >= 0;
      case '>':
        return order > 0;
      case '<=':
        return order <= 0;
      case '<':
        return order < 0;
      default:
        return order === 0;
    }
  });
}

/**
 * Read the "packageManager" line of package.json.
 * Example: "pnpm@11.28.11" gives { name: "pnpm", version: "11.28.11" }.
 */
export function parsePackageManagerPin(text) {
  const match = /^([a-z]+)@(\d+\.\d+\.\d+)/.exec(String(text ?? '').trim());
  return match ? { name: match[1], version: match[2] } : null;
}

// ---------------------------------------------------------------------------
// Part 2: the rules
//
// Each rule receives the facts collected from the computer and returns one
// result: { level, title, detail, fix }.
//   level  "ok", "warn" (works, but read this) or "fail" (must be fixed)
//   fix    a list of lines that tell the person what to do
// ---------------------------------------------------------------------------

const RUN_AGAIN = 'Then close the terminal, open it again and run this check once more.';

function judgeNode({ nodeVersion, requiredNodeRange }) {
  if (satisfiesRange(nodeVersion, requiredNodeRange)) {
    return {
      level: 'ok',
      title: `Node.js ${nodeVersion}`,
      detail: `This project needs ${requiredNodeRange}.`,
    };
  }

  const wanted = parseVersion(findVersionIn(requiredNodeRange));
  const major = wanted ? wanted[0] : '';
  return {
    level: 'fail',
    title: `Node.js ${nodeVersion} is not a version this project can use`,
    detail: `This project needs ${requiredNodeRange}.`,
    fix: [
      `Install Node.js ${major} from https://nodejs.org (choose version ${major}, even if a newer one is offered).`,
      RUN_AGAIN,
    ],
  };
}

function judgePnpm({ pnpmVersion, pnpmProblem, pinnedPnpmVersion }) {
  const pinned = parseVersion(pinnedPnpmVersion);
  if (!pinned) {
    return {
      level: 'fail',
      title: 'package.json does not say which pnpm version to use',
      detail: 'The "packageManager" line should look like "pnpm@11.28.11".',
      fix: ['Ask the team before changing the "packageManager" line in package.json.'],
    };
  }

  const installCommand = `npm install -g pnpm@${pinned[0]}`;
  const found = parseVersion(pnpmVersion);

  if (!found) {
    const looksLikeNetwork = /ENOTFOUND|ETIMEDOUT|ECONNRE|EAI_AGAIN|FETCH_FAIL|network/i.test(
      pnpmProblem ?? '',
    );
    return {
      level: 'fail',
      title: 'pnpm was not found, or it could not start',
      detail: pnpmProblem ? `The computer said: ${pnpmProblem}` : '',
      fix: looksLikeNetwork
        ? [
            `Check your internet connection. pnpm has to download version ${pinnedPnpmVersion} once.`,
            'Then run this check again.',
          ]
        : [installCommand, RUN_AGAIN],
    };
  }

  if (found[0] < OLDEST_PNPM_THAT_SWITCHES) {
    return {
      level: 'fail',
      title: `pnpm ${pnpmVersion} is too old`,
      detail: `This project uses pnpm ${pinnedPnpmVersion}.`,
      fix: [installCommand, RUN_AGAIN],
    };
  }

  if (found[0] !== pinned[0]) {
    return {
      level: 'warn',
      title: `pnpm ${pnpmVersion} found, but this project uses pnpm ${pinned[0]}`,
      detail: `pnpm normally switches to ${pinnedPnpmVersion} by itself inside this folder. Installing the matching version avoids surprises.`,
      fix: [installCommand],
    };
  }

  const exact = compareVersions(found, pinned) === 0;
  return {
    level: 'ok',
    title: `pnpm ${pnpmVersion}`,
    detail: exact
      ? 'Same version as the one pinned in package.json.'
      : `package.json pins ${pinnedPnpmVersion}. Same major version, so this is fine.`,
  };
}

function judgeGit({ gitVersion }) {
  const found = parseVersion(gitVersion);
  if (!found) {
    return {
      level: 'fail',
      title: 'Git was not found',
      detail: 'Git records every change to the code and lets the team share it.',
      fix: ['Install Git from https://git-scm.com.', RUN_AGAIN],
    };
  }

  if (compareVersions(found, parseVersion(OLDEST_GOOD_GIT)) < 0) {
    return {
      level: 'warn',
      title: `Git ${gitVersion} is old`,
      detail: `Some commands in our guides need Git ${OLDEST_GOOD_GIT} or newer.`,
      fix: ['Install the current Git from https://git-scm.com.'],
    };
  }

  return { level: 'ok', title: `Git ${gitVersion}`, detail: '' };
}

function judgeGitIdentity({ gitVersion, gitUserName, gitUserEmail }) {
  // Without Git there is nothing to configure yet. The Git rule already reports that.
  if (!parseVersion(gitVersion)) return null;

  if (gitUserName && gitUserEmail) {
    return { level: 'ok', title: 'Git knows your name and email', detail: '' };
  }

  return {
    level: 'warn',
    title: 'Git does not know your name or email yet',
    detail: 'Every saved change (a "commit") records who made it.',
    fix: [
      'git config --global user.name "Your Name"',
      'git config --global user.email "you@example.com"',
    ],
  };
}

function judgeProjectFolder({ projectPath }) {
  const problems = [];
  if (/[^\x20-\x7E]/.test(projectPath)) problems.push('it contains non-English characters');
  if (/\s/.test(projectPath)) problems.push('it contains a space');
  if (/onedrive|dropbox|icloud|mobile documents|google ?drive/i.test(projectPath)) {
    problems.push('it is inside a cloud-sync folder');
  }

  if (problems.length === 0) {
    return { level: 'ok', title: 'Project folder', detail: projectPath };
  }

  return {
    level: 'warn',
    title: 'The project folder may cause trouble later',
    detail: `${projectPath}: ${problems.join(', ')}. Some build tools fail in such folders.`,
    fix: [
      'Move the whole project to a short, simple path, for example',
      'C:\\dev\\carcare-platform on Windows or ~/dev/carcare-platform on a Mac.',
    ],
  };
}

/** Apply every rule to the collected facts. Returns the list of results. */
export function judge(facts) {
  return [
    judgeNode(facts),
    judgePnpm(facts),
    judgeGit(facts),
    judgeGitIdentity(facts),
    judgeProjectFolder(facts),
  ].filter(Boolean);
}

/** The check ends with exit code 1 when something must be fixed, otherwise 0. */
export function exitCodeFor(results) {
  return results.some((result) => result.level === 'fail') ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Part 3: turning the results into text
//
// Plain letters only (no colours or symbols), so the report looks the same in
// every terminal on Windows, macOS and Linux.
// ---------------------------------------------------------------------------

const LABELS = { ok: 'OK  ', warn: 'WARN', fail: 'FAIL' };
const INDENT = '        ';

export function formatReport(results, system) {
  const lines = ['', 'Car Care Platform: tool check', `System: ${system}`, ''];

  for (const result of results) {
    lines.push(`  ${LABELS[result.level]}  ${result.title}`);
    if (result.detail) lines.push(`${INDENT}${result.detail}`);
    (result.fix ?? []).forEach((fixLine, index) => {
      lines.push(`${INDENT}${index === 0 ? 'Fix: ' : '     '}${fixLine}`);
    });
  }

  lines.push('');
  if (results.some((result) => result.level === 'fail')) {
    lines.push('Result: NOT READY. Fix each FAIL line above, then run this check again.');
  } else if (results.some((result) => result.level === 'warn')) {
    lines.push('Result: READY, with warnings. Please read the WARN lines above.');
  } else {
    lines.push('Result: READY. All checks passed.');
  }
  lines.push('');

  return lines.join('\n');
}
