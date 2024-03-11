import { QueryInterface, Sequelize }from 'sequelize';

// Sequelize Migration Script
module.exports = {
  up: async (queryInterface: QueryInterface, _: Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // transforming Partnership to Mentorship, and partnershipId to mentorshipId
      await queryInterface.renameTable('Partnership', 'Mentorship', { transaction });
      await queryInterface.renameColumn('Mentorship', 'partnershipId', 'mentorshipId', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: async (queryInterface: QueryInterface, _: Sequelize) => {
    // for reverting the changes
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.renameTable('Mentorship', 'Partnership', { transaction });
      await queryInterface.renameColumn('Partnership', 'mentorshipId', 'partnershipId', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
