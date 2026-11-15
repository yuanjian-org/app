---
name: weekly-test-coverage
description: >-
  Improve test coverage of one single important, non-trivial backend function
  or route on a weekly basis by identifying missing test files, missing test
  cases, or missing condition combinations while avoiding duplicates with open
  PRs. Use when asked to perform the weekly test coverage task or improve
  backend unit test coverage.
---
# Weekly Backend Test Coverage Improvement

Follow these rules strictly when improving backend test coverage:

## Constraints

1. **Single target only**: Improve test coverage of **one single** important,
   non-trivial backend function or route per run.
2. **Check open PRs first**:
   - Inspect all open pull requests (`gh pr list --state open --limit 50
     --json number,title,headRefName,files`) and their diffs
     (`gh pr diff <number> --name-only`).
   - Ignore functions or routes that already have test improvements pending
     for review.
   - Do NOT create tests that duplicate tests in open PRs.
3. **What to look for**:
   - Missing `.test.ts` files for important backend modules or routes under
     `src/api/`.
   - Missing test cases for exported functions or route implementations.
   - Missing combinations of conditions, permission checks, or edge cases
     that existing tests should have covered.
4. **Testing best practices** (from `AGENTS.md` and `docs/CodingStyle.md`):
   - **Transaction rollback**: Wrap each test in a Sequelize transaction
     (`beforeEach` creates `transaction = await sequelize.transaction()`,
     `afterEach` rolls it back with `await transaction.rollback()`) to clean
     up test fixtures automatically.
   - **Real database and objects**: Always use the real database and real
     model objects. Avoid mocks unless testing external third-party HTTP/API
     boundaries where existing tests stub network calls.
   - **Simplicity**: Prioritize simple test constructs and a focused set of
     test cases covering core functionality and essential corner cases.
   - **Coding style**: Keep all lines (including comments) within 80
     characters, avoid `any` types where possible, and refer to database
     models via `db.<Model>`.

## Workflow

1. **Check open PRs**:
   - Run `gh pr list --state open --limit 50 --json
     number,title,headRefName,files` to list all open PRs and see which
     files/routes already have pending test changes.
2. **Identify a target**:
   - Sync with the latest `main` branch (`git checkout main && git pull`).
   - Compare backend files in `src/api/` (especially `src/api/routes/`)
     against their corresponding `.test.ts` files to find an important,
     non-trivial function or route with missing tests or uncovered condition
     branches.
3. **Write tests**:
   - Create a new branch (`git checkout -b <branch-name>`).
   - Add or update the `.test.ts` file for the single chosen backend function
     or route using transaction rollback for test fixtures.
4. **Verify**:
   - Ensure the local PostgreSQL test database is running and migrated
     (`yarn migrate-db`).
   - Run `yarn test:file <path-to-test-file>`, `yarn lint`, `yarn test`, and
     `yarn build` and ensure all pass without errors.
5. **Submit PR**:
   - Commit the test changes, push the branch
     (`git push -u origin <branch-name>`), and open a pull request against
     `main` using `gh pr create`.
