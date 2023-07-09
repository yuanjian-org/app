import sequelizeInstance from "../src/api/database/sequelizeInstance";

console.log();
console.log("Syncing database... It may take a while. Grab a coffee.");
console.log();

sequelizeInstance.sync({ alter: { drop: false } }).then();
