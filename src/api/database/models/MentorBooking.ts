import {
  Column,
  Table,
  Model,
  BelongsTo,
  ForeignKey,
  Unique,
  IsUUID,
  PrimaryKey,
  Default,
  AllowNull,
} from "sequelize-typescript";
import { CreationOptional, STRING, UUID, UUIDV4 } from "sequelize";
import User from "./User";

@Table
export default class MentorBooking extends Model {
  @Unique
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  requesterId: string;

  @ForeignKey(() => User)
  @Column(UUID)
  requestedMentorId: string | null;

  @ForeignKey(() => User)
  @Column(UUID)
  assignedMentorId: string | null;

  @AllowNull(false)
  @Column(STRING)
  topic: string;

  @Column(STRING)
  notes: string | null;

  @ForeignKey(() => User)
  @Column(UUID)
  updaterId: string | null;

  /**
   * Associations
   */

  @BelongsTo(() => User, { foreignKey: "requesterId" })
  requester: User;

  @BelongsTo(() => User, { foreignKey: "requestedMentorId" })
  requestedMentor: User;

  @BelongsTo(() => User, { foreignKey: "assignedMentorId" })
  assignedMentor: User;

  @BelongsTo(() => User, { foreignKey: "updaterId" })
  updater: User;
}
