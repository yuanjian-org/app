---
name: weekly-deduplicate
description: >-
  Reduce code duplication by identifying duplicate code and refactoring a
  single target at a time without sacrificing readability, touching unrelated
  files, or modifying landing page code, then verifying with yarn test and
  yarn build and opening a pull request. Use when asked to perform weekly
  code deduplication or reduce code duplication.
---
# Weekly Code Deduplication

Follow these rules strictly when performing a code deduplication refactoring:

## Constraints

1. **Single target only**: Only refactor a single duplicated pattern or helper
   at a time.
2. **Check open PRs first**:
   - Inspect all open pull requests (`gh pr list --state open --limit 50
     --json number,title,headRefName,files`) and their diffs.
   - Do NOT deduplicate code that already has changes pending in open PRs.
3. **Readability first**: Do NOT deduplicate at the cost of readability. The
   extracted helper or component must make the code clearer and easier to
   understand.
4. **No unrelated files**: Do NOT refactor multiple unrelated files in the
   same pull request. Prefer deduplicating within a single file or a tightly
   coupled pair of files.
5. **No landing page code**: Do NOT refactor landing page code (e.g.,
   `*LandingPage.tsx`, `src/pages/s/*` landing/marketing pages).
6. **Coding style** (from `AGENTS.md` and `docs/CodingStyle.md`):
   - Keep all lines (including comments) within the 80-character limit.
   - Add clear inline/JSDoc comments when making changes and keep existing
     comments up to date.
   - Avoid `any` types and refer to database models via `db.<Model>`.

## Workflow

1. **Check open PRs**:
   - Run `gh pr list --state open --limit 50 --json
     number,title,headRefName,files` to check all in-flight PRs.
2. **Identify a candidate**:
   - Sync with the latest `main` branch (`git checkout main && git pull`).
   - Scan `src/api/routes/`, `src/components/` (excluding landing pages), or
     `src/pages/` for clear, localized duplicated logic.
3. **Refactor**:
   - Create a descriptive feature branch (`git checkout -b <branch-name>`).
   - Extract the shared logic into a well-named helper function or component.
4. **Verify**:
   - Ensure the local PostgreSQL test database is running and migrated
     (`yarn migrate-db`).
   - Run `yarn lint`, `yarn test`, and `yarn build` and ensure all three pass
     without errors.
5. **Submit PR**:
   - Commit the change, push the branch (`git push -u origin <branch-name>`),
     and open a pull request against `main` using `gh pr create`.
