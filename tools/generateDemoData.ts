import sequelize from "../src/api/database/sequelize";
import { generateDemoData } from "../src/api/routes/generateDemoData";

async function main() {
  await sequelize.transaction(async t => {
    await generateDemoData(t);
  });
  
  // This make sure the process doesn't hang waiting for connection closure.
  await sequelize.close();
}

void main().then();
