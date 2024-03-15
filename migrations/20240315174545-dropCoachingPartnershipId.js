'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check if column 'coachingPartnershipId' exists in 'groups' table
    const groupsTable = await queryInterface.describeTable('groups');
    if (groupsTable && groupsTable['coachingPartnershipId']) {
      // Remove column 'coachingPartnershipId' from 'groups' table
      await queryInterface.removeColumn('groups', 'coachingPartnershipId');
    }
  },

  async down (queryInterface, Sequelize) {
    // Add column 'coachingPartnershipId' back to 'groups' table
    await queryInterface.addColumn('groups', 'coachingPartnershipId', {
      type: Sequelize.DataTypes.INTEGER,
    });
  }
};
