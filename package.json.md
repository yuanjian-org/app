# notes on package.json

## scripts
 `"prepare"` - runs on local installation e.g. `yarn install` or `npm install`, see details: https://docs.npmjs.com/cli/v9/using-npm/scripts#life-cycle-scripts
- `husky install` is required by husky official doc, see details: https://typicode.github.io/husky/getting-started.html
-  `if [ \"$VERCEL_ENV\" = \"production\" ]` statement is to check if the application is deployed on Vercel, then run `yarn sync-database` on each deployment.
