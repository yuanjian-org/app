import { QueryInterface, DataTypes }from 'sequelize';

module.exports = {
    up: async (queryInterface: QueryInterface) => {
      // Check if column 'internalChatThreadId' exists in 'Partnerships' table
      const partnershipsTable = await queryInterface.describeTable('Partnerships');
      if (partnershipsTable && partnershipsTable['internalChatThreadId']) {
        // Remove column 'internalChatThreadId' from 'Partnerships' table
        await queryInterface.removeColumn('Partnerships', 'internalChatThreadId');
      }
    },
  
    down: async (queryInterface: QueryInterface) => {
      // Add column 'internalChatThreadId' back to 'Partnerships' table
      await queryInterface.addColumn('Partnerships', 'internalChatThreadId', {
        type: DataTypes.INTEGER,
      });
    },
  };
  