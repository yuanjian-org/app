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
import { CreationOptional, DATE, UUID, UUIDV4 } from "sequelize";
import User from "./User";
import Assessment from "./Assessment";
import Group from "./Group";

/**
 * A mentorship is a mentee-mentor pair.
 */
@Table({
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
   * See Glossary.md for the definition of relational and transactional
   * mentorship. Possible combinations of the two end dates:
   * 
   * | relationalEndedAt | transactionalEndsAt | Meaning |
   * |-------------------|--------------------:|:--------|
   * | null              | null                | relational ongoing |
   * | null              | {date}              | relational ended |
   * | {date}            | null                | transactional only (ongoing or ended depending on the date) |
   * | {date}            | {date}              | invalid mode. assume transactional only |
   * 
   */
  @Column(DATE)
  relationalEndedAt: string | null;

  @Column(DATE)
  transactionalEndsAt: string | null;

  /**
   * Associations
   */

  @BelongsTo(() => User, { foreignKey: 'mentorId' })
  mentor: User;

  @BelongsTo(() => User, { foreignKey: 'menteeId' })
  mentee: User;

  @HasOne(() => Group, { foreignKey: "partnershipId" })
  group: Group;

  @HasMany(() => Assessment)
  assessments: Assessment[];
}

export default Mentorship;
