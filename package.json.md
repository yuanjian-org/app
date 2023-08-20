# notes on package.json

## scripts
 `"prepare"`
- `husky install` is required by husky official doc, see details: https://typicode.github.io/husky/getting-started.html
-  `if [ \"$VERCEL_ENV\" = \"production\" ]` statement is to check if the application is deployed on Vercel, then run `yarn sync-database` on each deployment.
