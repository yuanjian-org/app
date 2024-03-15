import { QueryInterface, DataTypes }from 'sequelize';

module.exports = {
    up: async (queryInterface: QueryInterface) => {
      // Check if 'ChatThreads' table exists
      const chatThreadsTable = await queryInterface.describeTable('ChatThreads');
      if (chatThreadsTable) {
        // drop 'ChatThreads' table
        await queryInterface.dropTable('ChatThreads');
      }
    },
  
    down: async (queryInterface: QueryInterface) => {
    },
  };
  