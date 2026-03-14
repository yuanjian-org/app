import sequelize from "../src/api/database/sequelize";
import { generateDemoDataImpl } from "../src/api/routes/demoDataInternal";

async function main() {
  await sequelize.transaction(async t => {
    await generateDemoDataImpl(t);
  });
  
  // This make sure the process doesn't hang waiting for connection closure.
  await sequelize.close();
}

void main().then();
