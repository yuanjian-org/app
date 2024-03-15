import { QueryInterface, DataTypes }from 'sequelize';

module.exports = {
    up: async (queryInterface: QueryInterface) => {
      // Check if column 'coachingPartnershipId' exists in 'groups' table
      const groupsTable = await queryInterface.describeTable('groups');
      if (groupsTable && groupsTable['coachingPartnershipId']) {
        // Remove column 'coachingPartnershipId' from 'groups' table
        await queryInterface.removeColumn('groups', 'coachingPartnershipId');
      }
    },
  
    down: async (queryInterface: QueryInterface) => {
      // Add column 'coachingPartnershipId' back to 'groups' table
      await queryInterface.addColumn('groups', 'coachingPartnershipId', {
        type: DataTypes.INTEGER,
      });
    },
  };
  