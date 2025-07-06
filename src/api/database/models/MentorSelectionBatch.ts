import {
  Column,
  Table,
  Model,
  PrimaryKey,
  IsUUID,
  Default,
  ForeignKey,
  AllowNull,
  HasMany,
} from "sequelize-typescript";
import { CreationOptional, DATE, UUID, UUIDV4 } from "sequelize";
import User from "./User";
import { DateColumn } from "shared/DateColumn";
import MentorSelection from "./MentorSelection";

@Table
export default class MentorSelectionBatch extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  // TODO: Rename to menteeId
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  userId: string;

  // null if not finalized. There can be at most one non-finalized batch per
  // user.
  @Column(DATE)
  finalizedAt: DateColumn | null;

  /**
   * Associations
   */

  @HasMany(() => MentorSelection)
  selections: MentorSelection[];
}
