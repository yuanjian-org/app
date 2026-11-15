---
name: weekly-bug-hunt
description: >-
  Deeply analyze the codebase on a weekly basis to identify real bugs,
  propose targeted fixes with regression tests, verify with yarn lint, yarn
  test, and yarn build, and submit pull requests while avoiding duplicates
  with open PRs. Use when asked to perform the weekly bug hunt task or
  analyze the codebase for bugs.
---
# Weekly Codebase Bug Analysis & Fix

Follow these rules strictly when performing the weekly codebase bug analysis
and fix task:

## Constraints

1. **Check open PRs first**:
   - Inspect all open pull requests (`gh pr list --state open --limit 50
     --json number,title,headRefName,files`) and their diffs
     (`gh pr diff <number>`).
   - Do NOT report or fix bugs that already have fixes pending in open PRs.
2. **Real, high-impact bugs only**:
   - Focus on genuine functional, data-integrity, authorization/permission,
     transaction/concurrency, or unhandled edge-case bugs.
   - Do NOT open PRs for purely stylistic changes, speculative refactors, or
     unused code cleanup under this task.
3. **Focused fixes with regression tests**:
   - Keep each PR focused on a single bug (or a single root cause) so it is
     easy to review.
   - Include a unit test (or update an existing `.test.ts` file) that
     reproduces the bug and verifies the fix, using Sequelize transaction
     rollback (`beforeEach` / `afterEach`) for test fixtures.
4. **Coding style** (from `AGENTS.md` and `docs/CodingStyle.md`):
   - Keep all lines (including comments) within the 80-character limit.
   - Add clear comments explaining non-obvious fixes and keep existing
     comments accurate.
   - Avoid `any` types and refer to database models via `db.<Model>`.

## Workflow

1. **Check open PRs**:
   - Run `gh pr list --state open --limit 50 --json
     number,title,headRefName,files` to see all in-flight changes.
2. **Deeply analyze the codebase**:
   - Sync with the latest `main` branch (`git checkout main && git pull`).
   - Audit backend routes (`src/api/routes/`), data models and helpers
     (`src/api/`), and frontend logic (`src/components/`, `src/pages/`) for
     bugs such as:
     - Missing or inconsistent authorization/permission checks
     - Missing Sequelize `transaction` propagation inside transactional
       operations
     - Incorrect query filters, state transitions, or boundary conditions
     - Unhandled `null`/`undefined` values or broken error handling
     - Race conditions or stale state bugs
3. **Propose and implement the fix**:
   - Create a new branch from `main` (`git checkout -b <branch-name>`).
   - Implement a minimal, clean fix for the identified bug and add a
     regression test.
4. **Verify**:
   - Ensure the local PostgreSQL test database is running and migrated
     (`yarn migrate-db`).
   - Run `yarn lint`, `yarn test`, and `yarn build` and ensure all pass
     without errors.
5. **Submit PR**:
   - Commit the fix and test, push the branch
     (`git push -u origin <branch-name>`), and open a pull request against
     `main` using `gh pr create` with a clear explanation of the bug's root
     cause, impact, and fix.
