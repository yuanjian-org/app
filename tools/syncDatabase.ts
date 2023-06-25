import inquirer from 'inquirer';
import sequelizeInstance from "../src/api/database/sequelizeInstance";

inquirer
  .prompt([
    {
      type: 'list',
      name: 'action',
      prefix: 'Affected tables: \n' + Object.values(sequelizeInstance.modelManager.all).map(m => '\t' + m.tableName).join('\n') + '\n',
      message: 'Choose your action',
      choices: [
        'Alter tables without dropping anything',
        'Delete tables (if any) and recreate them'
      ]
    },
  ])
  .then((answers: {action: string}) => {
    console.log(`Your action is ${answers.action}.`);

    if (answers.action.startsWith('Delete')) {
      console.log('### NO-OP. Modify source code if you really intend to drop all data.');
      // sequelizeInstance.sync({ force: true });
    } else if (answers.action.startsWith('Alter')) {
      sequelizeInstance.sync({ alter: { drop: false } });
    }
  })
  .catch((error) => {
    console.log(`Error: ${error}`);
  });


