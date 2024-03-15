import { QueryInterface, DataTypes }from 'sequelize';

module.exports = {
    up: async (queryInterface: QueryInterface) => {
      // Check if column 'threadId' exists in 'ChatMessages' table
      const chatMessagesTable = await queryInterface.describeTable('ChatMessages');
      if (chatMessagesTable && chatMessagesTable['threadId']) {
        // Remove column 'threadId' from 'ChatMessages' table
        await queryInterface.removeColumn('ChatMessages', 'threadId');
      }
    },
  
    down: async (queryInterface: QueryInterface) => {
      // Add column 'threadId' back to 'ChatMessages' table
      await queryInterface.addColumn('ChatMessages', 'threadId', {
        type: DataTypes.INTEGER,
      });
    },
  };
  