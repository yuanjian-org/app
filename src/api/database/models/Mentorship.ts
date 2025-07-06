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
import {
  BOOLEAN,
  CreationOptional,
  DATE,
  JSONB,
  UUID,
  UUIDV4,
} from "sequelize";
import User from "./User";
import Assessment from "./Assessment";
import Group from "./Group";
import { DateColumn } from "../../../shared/DateColumn";
import {
  MentorshipSchedule,
  zMentorshipSchedule,
} from "../../../shared/Mentorship";
import ZodColumn from "../modelHelpers/ZodColumn";

/**
 * A mentorship is a mentee-mentor pair.
 */
@Table({
  indexes: [
    {
      unique: true,
      fields: ["mentorId", "menteeId"],
    },
  ],
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

  // See shared/Mentorship.ts for documentation.
  @AllowNull(false)
  @Column(BOOLEAN)
  transactional: boolean;

  // See shared/Mentorship.ts for documentation.
  @Column(DATE)
  endsAt: DateColumn | null;

  @ZodColumn(JSONB, zMentorshipSchedule.nullable())
  schedule: MentorshipSchedule | null;

  /**
   * Associations
   */

  @BelongsTo(() => User, { foreignKey: "mentorId" })
  mentor: User;

  @BelongsTo(() => User, { foreignKey: "menteeId" })
  mentee: User;

  @HasOne(() => Group, { foreignKey: "partnershipId" })
  group: Group;

  @HasMany(() => Assessment)
  assessments: Assessment[];
}

export default Mentorship;
