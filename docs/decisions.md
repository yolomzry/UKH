# Decision log

Short notes on the decisions that shape this project: what we chose, when, and why.

How to use this file:

- Add a new entry at the bottom when something important is decided.
- Do not rewrite old entries. If a decision changes, add a new entry that says so.
- Keep each entry short. Link to the blueprint or a discussion for the details.

## 2026-11-10: Phase 0 blueprint approved

The team approved the Phase 0 blueprint without changes. The defaults listed in
section 18 of the blueprint therefore apply:

1. Station-first. A few mobile providers are added by hand.
2. Developer accounts: test an individual account first while the company question is decided.
3. Commission: a "shadow ledger" during the pilot. Amounts are recorded, nothing is charged.
   The rate and the rounding rule are still open.
4. Team roles as proposed in section 14, to be adjusted once weekly hours are known.
5. Hosting: one self-managed server with tested backups. Final choice when we reach deployment.
6. Brand direction A (Minimalist Trust) is the working choice. It is not final until the
   team confirms it at the start of the design work.
7. Vaqto and Super TT stay out of the competitor analysis until someone identifies them.
8. A local lawyer reviews the product before public launch. No wallet until then.
9. Pilot in one neighbourhood of Erbil, starting with station owners the team knows.
10. Running costs stay at the low pilot figure until validation passes.

## 2026-11-10: One repository for everything (a monorepo)

The mobile app, the two websites, the server and their shared code live in this
one repository, split into `apps/` and `packages/`.

Why: a rule such as "what a valid phone number looks like" is written once and
used everywhere. One change, one review, one place to look.

## 2026-11-10: pnpm 11 as the package manager, pinned to 11.28.11

A package manager downloads the libraries a project uses. We use pnpm, and
`package.json` pins the exact version so that all of us run the same one.

Why pnpm and not npm: in a repository with several apps, pnpm keeps each app's
libraries separate. An app cannot use a library it never asked for, which
prevents a whole class of "works on my computer" bugs. Expo documents pnpm as a
supported choice for monorepos.

Why version 11 and not 12: pnpm 12 is the newest line. It is a rewrite of pnpm in
another programming language (Rust) and was declared stable around the end of
August 2026. Its makers say it keeps the commands and the lockfile format of
pnpm 11. We start on the older, calmer line. Moving to 12 later means changing
one line in `package.json`.

Checked on 10 November 2026: 11.28.11 was the newest pnpm 11 release (5 November 2026).

## 2026-11-10: Node.js 24

Everyone uses Node.js 24, version 24.11 or newer.

- Why 24: it is a long-term support line. The Node.js release schedule lists it as
  supported until 30 April 2028.
- Why not 26: its long-term support phase was scheduled to start on 28 October 2026,
  two weeks before this decision. We let the tools we depend on catch up first, then
  revisit.
- Why at least 24.11: Prisma 8, the next version of the database library we plan to
  use, states that it needs 24.11 or newer on the 24 line.

Expo SDK 58 lists Node.js 22.13 as its minimum, so 24 is fine for the mobile app.

## 2026-11-10: "npm install" is blocked in this repository

Running `npm install` in a pnpm project creates a second, conflicting set of
files. `package.json` and `.npmrc` together make `npm install` stop with an error
at the top level of the repository. One-off commands such as `npx` still work.

## 2026-11-10: UTF-8 text and LF line endings everywhere

Set in `.gitattributes`, `.editorconfig` and `.vscode/settings.json`.

Why: the team mixes Windows and macOS, and the product has Kurdish and Arabic
text. One encoding and one line-ending style avoid files that look changed when
nobody touched them, and avoid broken letters.

## 2026-11-10: Working name "Car Care Platform"

The repository is called `carcare-platform`. This is a placeholder, not a brand.
Renaming is cheap now and gets more expensive with every package we add, so the
real name should be settled before Milestone 1.3 creates the first shared package.
