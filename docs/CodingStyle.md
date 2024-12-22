# Coding Style

[ESLint](../.eslintrc.json) enforces coding styles. Additionally:

1. 80 characters per line. Use 2 spaces for each tab.
1. A sequelize table field should either has the `@AllowNull(false)` decorator or has `| null` in the type. `@AllowNull(true)` is the default value and shouldn't appear in the code.
1. Do NOT refer to database models directly, e.g. `User.findAll(...)`. Do `import db from "[...]/database/db"` 
and prefix model names with `db`, e.g. `db.User.findAl(...)`. This is to prevent confusion with data types of the same
name in the `shared` folder.
1. zod types returned by API routes and the fields within these types should
use nullable() and not optional(). optional() allows undefined values which
should be only used to indicate data is still being loaded in the frontend.
