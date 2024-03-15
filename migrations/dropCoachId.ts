import { QueryInterface, DataTypes }from 'sequelize';

module.exports = {
    up: async (queryInterface: QueryInterface) => {
      // Check if column 'coachId' exists in 'Partnerships' table
      const partnershipsTable = await queryInterface.describeTable('Partnerships');
      if (partnershipsTable && partnershipsTable['coachId']) {
        // Remove column 'coachId' from 'Partnerships' table
        await queryInterface.removeColumn('Partnerships', 'coachId');
      }
    },
  
    down: async (queryInterface: QueryInterface) => {
      // Add column 'coachId' back to 'Partnerships' table
      await queryInterface.addColumn('Partnerships', 'coachId', {
        type: DataTypes.INTEGER,
      });
    },
  };
  