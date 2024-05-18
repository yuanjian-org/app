# Notes on package.json

## Commands
`yarn test` - run all unit tests

`yarn prepare` - runs on local installation e.g. `yarn install` or `npm install`, see details: https://docs.npmjs.com/cli/v9/using-npm/scripts#life-cycle-scripts

- `husky install` is required by husky official doc, see details: https://typicode.github.io/husky/getting-started.html
-  `if [ \"$VERCEL_ENV\" = \"production\" ]` statement is to check if the application is deployed on Vercel, then run `yarn sync-database` on each deployment.

## Troubleshooting for Windows users

- If you run into error `'TS_NODE_PROJECT' is not recognized as an internal or external command`, add `cross-env` in front of the `TS_NODE_PROJECT=...`.
- If you run into error `"$VERCEL_ENV" was unexpected`, remove `&& if [ \"$VERCEL_ENV\" = \"production\" ]; then ts-node tools/syncDatabase.ts; fi`, then re-run the command.
- 
