'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check if column 'internalChatThreadId' exists in 'Partnerships' table
    const partnershipsTable = await queryInterface.describeTable('Partnerships');
    if (partnershipsTable && partnershipsTable['internalChatThreadId']) {
      // Remove column 'internalChatThreadId' from 'Partnerships' table
      await queryInterface.removeColumn('Partnerships', 'internalChatThreadId');
    }
  },

  async down (queryInterface, Sequelize) {
    // Add column 'internalChatThreadId' back to 'Partnerships' table
    await queryInterface.addColumn('Partnerships', 'internalChatThreadId', {
      type: Sequelize.DataTypes.INTEGER,
    });
  }
};
