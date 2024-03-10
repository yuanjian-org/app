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

import {
  Column,
  ForeignKey,
  Table,
  BelongsTo,
  Model,
  PrimaryKey,
  IsUUID,
  Default,
  AllowNull,
} from "sequelize-typescript";
import { CreationOptional, STRING, UUID, UUIDV4 } from "sequelize";
import Mentorship from "./Mentorship";

/**
 * An assessment is an evaluation of a mentoring mentorship.
 */
@Table({
  paranoid: true,
})
class MentorshipAssessment extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  @ForeignKey(() => Mentorship)
  @AllowNull(false)
  @Column(UUID)
  mentorshipId: string;

  @Column(STRING(1 * 1024 * 1024))
  summary: string | null;
}

export default MentorshipAssessment;
