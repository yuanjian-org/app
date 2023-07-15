# Coding Style

[ESLint](../.eslintrc.json) enforces most coding styles (under development). Additionally,

1. A sequelize table field should either has the `@AllowNull(false)` decorator or has `| null` in the type.
2. Do NOT refer to database models directly, e.g. `User.findAll(...)`. Do `import db from "[...]/database/db"` 
and prefix model names with `db`, e.g. `db.User.findAl(...)`. This is to prevent confusion with data types of the same
name in the `shared` folder.
