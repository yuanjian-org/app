'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check if column 'coachId' exists in 'Partnerships' table
    const partnershipsTable = await queryInterface.describeTable('Partnerships');
    if (partnershipsTable && partnershipsTable['coachId']) {
      // Remove column 'coachId' from 'Partnerships' table
      await queryInterface.removeColumn('Partnerships', 'coachId');
    }
  },

  async down (queryInterface, Sequelize) {
      // Add column 'coachId' back to 'Partnerships' table
      await queryInterface.addColumn('Partnerships', 'coachId', {
      type: Sequelize.DataTypes.INTEGER
    });
  }
};
