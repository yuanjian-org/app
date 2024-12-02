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
import { BOOLEAN, CreationOptional, DATE, UUID, UUIDV4 } from "sequelize";
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

  // Whether this mentorship is transactional or relational. See
  // docs/Glossary.md for their definitions.
  @AllowNull(false)
  @Column(BOOLEAN)
  transactional: boolean;

  @Column(DATE)
  endsAt: string | null;

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
