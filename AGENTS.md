# Repository Guidelines

- Make sure `yarn build` and `yarn test` pass before submitting pull requests.
- Follow [docs/CodingStyle.md](docs/CodingStyle.md), including the 80-character
  line limit for both code and comments.
- Avoid `any` types (currently not enforced by ESLint).
- Prefer testing against a real PostgreSQL database over mocking Sequelize
  models.
- When updating files for i18n support, ignore the entire file if it contains
  `@i18n-ignore-file`, and ignore the line immediately below `@i18n-ignore`.
