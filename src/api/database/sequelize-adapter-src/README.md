
To work around the following error when importing @auth/sequelize-adapter, this folder contains minimally required files
extracted from https://registry.yarnpkg.com/@auth/sequelize-adapter/-/sequelize-adapter-1.0.2.tgz.

```
$ yarn sync-database
...
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: No "exports" main defined in node_modules/@auth/sequelize-adapter/package.json
...
```

At the time of writing, there is no known solution to this problem. We also posted https://stackoverflow.com/q/77138923.
