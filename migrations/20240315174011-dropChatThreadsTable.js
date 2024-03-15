'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check if 'ChatThreads' table exists
    const allTables = await queryInterface.showAllTables();
    if (allTables && allTables.includes('ChatThreads')) {
      // Drop 'ChatThreads' table if it exists
      await queryInterface.dropTable('ChatThreads');
    }
  },

  async down (queryInterface, Sequelize) {
  }
};
