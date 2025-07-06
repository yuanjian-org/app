import {
  Column,
  Table,
  Model,
  ForeignKey,
  AllowNull,
  BelongsTo,
} from "sequelize-typescript";
import { INTEGER, STRING, UUID } from "sequelize";
import User from "./User";
import MentorSelectionBatch from "./MentorSelectionBatch";

@Table({
  indexes: [
    {
      fields: ["batchId", "mentorId"],
      unique: true,
    },
    {
      fields: ["batchId", "order"],
      unique: true,
    },
  ],
})
export default class MentorSelection extends Model {
  @ForeignKey(() => MentorSelectionBatch)
  @AllowNull(false)
  @Column(UUID)
  batchId: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  mentorId: string;

  @AllowNull(false)
  @Column(INTEGER)
  order: number;

  @AllowNull(false)
  @Column(STRING(1 * 1024 * 1024))
  reason: string;

  /**
   * Associations
   */
  @BelongsTo(() => User)
  mentor: User;
}
