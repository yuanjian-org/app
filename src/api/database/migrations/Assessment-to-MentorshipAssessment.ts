import { QueryInterface, Sequelize }from 'sequelize';

// Sequelize Migration Script
module.exports = {
  up: async (queryInterface: QueryInterface, _: Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // transforming Assessment to MentorshipAssessment
      await queryInterface.renameTable('Assessment', 'MentorshipAssessment', { transaction });
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
      await queryInterface.renameTable('MentorshipAssessment', 'Assessment', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
