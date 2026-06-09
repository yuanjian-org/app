import { QueryInterface } from "sequelize";

const migration = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Migrate Project Status
    await queryInterface.sequelize.query(`
      UPDATE "Projects" SET status = '草稿' WHERE status = 'Draft';
    `);
    await queryInterface.sequelize.query(`
      UPDATE "Projects" SET status = '招募中' WHERE status = 'Open';
    `);
    await queryInterface.sequelize.query(`
      UPDATE "Projects" SET status = '已结束' WHERE status = 'Closed';
    `);

    // Migrate Project Visibility
    await queryInterface.sequelize.query(`
      UPDATE "Projects" SET visibility = '公开' WHERE visibility = 'Public';
    `);
    await queryInterface.sequelize.query(`
      UPDATE "Projects" SET visibility = '保密' WHERE visibility = 'Confidential';
    `);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Reverse migration for Project Status
    await queryInterface.sequelize.query(`
      UPDATE "Projects" SET status = 'Draft' WHERE status = '草稿';
    `);
    await queryInterface.sequelize.query(`
      UPDATE "Projects" SET status = 'Open' WHERE status = '招募中';
    `);
    await queryInterface.sequelize.query(`
      UPDATE "Projects" SET status = 'Closed' WHERE status = '已结束';
    `);

    // Reverse migration for Project Visibility
    await queryInterface.sequelize.query(`
      UPDATE "Projects" SET visibility = 'Public' WHERE visibility = '公开';
    `);
    await queryInterface.sequelize.query(`
      UPDATE "Projects" SET visibility = 'Confidential' WHERE visibility = '保密';
    `);
  },
};

export default migration;
