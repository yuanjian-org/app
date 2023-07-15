import sequelizeInstance from "../src/api/database/sequelizeInstance";
import migrateData from "./migrateData";

console.log();
console.log("Syncing database... It may take a while. Grab a coffee.");

sequelizeInstance.sync({ alter: { drop: false } }).then();

migrateData().then();
