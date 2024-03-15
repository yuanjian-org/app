'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check if column 'threadId' exists in 'ChatMessages' table
    const chatMessagesTable = await queryInterface.describeTable('ChatMessages');
    if (chatMessagesTable && chatMessagesTable['threadId']) {
      // Remove column 'threadId' from 'ChatMessages' table
      await queryInterface.removeColumn('ChatMessages', 'threadId');
    }
  },

  async down (queryInterface, Sequelize) {
    // Add column 'threadId' back to 'ChatMessages' table
    await queryInterface.addColumn('ChatMessages', 'threadId', {
      type: Sequelize.DataTypes.INTEGER,
    });
  }
};
