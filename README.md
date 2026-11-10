# Car Care Platform

Working name for the car wash and car care booking marketplace for Kurdistan.
The name is a placeholder until the brand is decided.

This one repository holds every part of the product: the customer mobile app,
the provider and admin websites, the server (API) and the code they share.
A repository organised this way is called a **monorepo**.

**Status:** Phase 1, Milestone 1.1. The repository skeleton and the tool check
exist. There is no application code yet.

## What you need on your computer

| Tool    | Version                           | How to check     |
| ------- | --------------------------------- | ---------------- |
| Node.js | 24 (24.11 or newer, not 25 or 26) | `node --version` |
| pnpm    | 11                                | `pnpm --version` |
| Git     | 2.28 or newer                     | `git --version`  |

Install Node.js 24 from <https://nodejs.org> and Git from <https://git-scm.com>.
Then install pnpm with this command:

```bash
npm install -g pnpm@11
```

On Windows, type commands in **Git Bash**, which is installed together with Git.
PowerShell often refuses to run `npm` and `pnpm` with the message
"running scripts is disabled on this system".

## First-time setup

Run these three commands inside the project folder, one at a time:

```bash
node scripts/check-tools.mjs
pnpm install
pnpm test
```

1. `node scripts/check-tools.mjs` checks your tools. Continue only when it ends
   with `Result: READY`.
2. `pnpm install` prepares the project. There are no libraries to download yet,
   so it takes a few seconds. It may create a file called `pnpm-lock.yaml` and a
   folder called `node_modules`. Both are normal. The file belongs in Git, the
   folder does not (Git ignores it automatically).
3. `pnpm test` runs the automatic tests. Every test must pass.

## Everyday commands

| Command            | What it does                                     |
| ------------------ | ------------------------------------------------ |
| `pnpm check:tools` | Checks Node.js, pnpm, Git and the project folder |
| `pnpm test`        | Runs every automatic test in the repository      |
| `pnpm install`     | Downloads the libraries the project needs        |

## Folder map

| Path                  | What lives there                                                   |
| --------------------- | ------------------------------------------------------------------ |
| `apps/`               | Programs we run: `api`, `mobile`, `provider-web`, `admin-web`      |
| `packages/`           | Code shared by the apps                                            |
| `scripts/`            | Small helper programs for developers, such as the tool check       |
| `docs/`               | The decision log and other notes                                   |
| `package.json`        | The project's identity card: name, required versions, commands     |
| `pnpm-workspace.yaml` | Tells pnpm that the folders in `apps/` and `packages/` belong here |

The app and package folders arrive in later milestones. See `apps/README.md` and
`packages/README.md` for what is planned.

## Team rules

1. Use pnpm for everything. Never run `npm install` or `yarn` inside this project.
   At the top level the project stops `npm install` on purpose. The only npm
   command we use is the one above that installs pnpm itself.
2. Never put passwords, keys or tokens in Git. Files named `.env` are ignored on purpose.
3. Never edit generated folders such as `node_modules`.
4. Work is finished only when it has been run and its tests pass.
5. When a decision changes how we build, add a short entry to `docs/decisions.md`.

## Phase 1 milestones

Each milestone is small and ends with a test that you run yourself. The next
one starts only after the team confirms the current one works. The plan can
change as we learn.

| No. | Milestone                                                    | Status                              |
| --- | ------------------------------------------------------------ | ----------------------------------- |
| 1.1 | Repository skeleton and tool check                           | Delivered, waiting for confirmation |
| 1.2 | GitHub, pull requests and automatic checks on every change   | Not started                         |
| 1.3 | Shared TypeScript settings and the first shared package      | Not started                         |
| 1.4 | API shell (NestJS) with a health check                       | Not started                         |
| 1.5 | Local database (PostgreSQL with PostGIS) and first migration | Not started                         |
| 1.6 | Customer app shell (Expo): three languages, right-to-left    | Not started                         |
| 1.7 | Provider and admin website shells (Next.js)                  | Not started                         |
| 1.8 | Phone sign-in from end to end                                | Not started                         |

Phase 1 ends at the first gate of the blueprint: sign-in works on real phones.

## If something goes wrong

| What you see                                               | What to do                                                        |
| ---------------------------------------------------------- | ----------------------------------------------------------------- |
| `pnpm: command not found`                                  | Run `npm install -g pnpm@11`, then close and reopen the terminal  |
| Mac: `EACCES` or "permission denied" from `npm install -g` | Run `sudo npm install -g pnpm@11` and type your Mac password      |
| Windows: "running scripts is disabled on this system"      | Use Git Bash instead of PowerShell                                |
| `npm error code EBADENGINE`                                | You ran `npm install`. Run `pnpm install` instead                 |
| `ERR_PNPM_UNSUPPORTED_ENGINE`                              | Your Node.js version is wrong. Run `node scripts/check-tools.mjs` |

If the table does not help, copy the full output of
`node scripts/check-tools.mjs` and share it with the team.

## More information

- Why we chose each tool: `docs/decisions.md`
- Product and technical plan: the Phase 0 blueprint,
  <https://claude.ai/artifact/9yGv8M9MKtbk9VcYfGmtXG> (ask the document owner for access)
