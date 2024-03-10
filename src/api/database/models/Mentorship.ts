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

import {
  Column,
  ForeignKey,
  Table,
  BelongsTo,
  Model,
  PrimaryKey,
  IsUUID,
  Default,
  HasMany,
  AllowNull,
  HasOne,
  Unique,
} from "sequelize-typescript";
import { CreationOptional, UUID, UUIDV4 } from "sequelize";
import User from "./User";
import MentorshipAssessment from "./MentorshipAssessment";
import Group from "./Group";

/**
 * A mentorship is a mentee-mentor pair.
 * 
 */
@Table({
  paranoid: true,
  indexes: [{
    unique: true,
    fields: ['mentorId', 'menteeId']
  }]
})
class Mentorship extends Model {
  @Unique
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  mentorId: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  menteeId: string;

  /**
   * Associations
   */

  @BelongsTo(() => User, { foreignKey: 'mentorId' })
  mentor: User;

  @BelongsTo(() => User, { foreignKey: 'menteeId' })
  mentee: User;

  @HasOne(() => Group, { foreignKey: "mentorshipId" })
  group: Group;

  @HasMany(() => MentorshipAssessment)
  mentorshipAssessment: MentorshipAssessment[];
}

export default Mentorship;
