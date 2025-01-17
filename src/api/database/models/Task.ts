import {
  Column,
  Table,
  Model,
  ForeignKey,
  AllowNull,
  Index,
  BelongsTo,
} from "sequelize-typescript";
import { BOOLEAN, STRING, TEXT, UUID } from "sequelize";
import User from "./User";

@Table({
  indexes: [{
    fields: ["userId", "autoTaskId"],
    unique: true,
  }],
})
export default class Task extends Model {
  @Index
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  userId: string;

  /**
   * When null, the task is an auto task.
   */
  @ForeignKey(() => User)
  @Column(UUID)
  creatorId: string | null;

  /**
   * Unique identifier of an auto task. There can be only one task for a given
   * autoTaskId per user. This column is used only when creatorId is null.
   */
  @Column(STRING)
  autoTaskId: string | null;

  /**
   * This column is used only when creatorId is not null.
   */
  @Column(TEXT)
  markdown: string | null;

  @Index
  @AllowNull(false)
  @Column(BOOLEAN)
  done: boolean;

  /**
   * Associations
   */

  @BelongsTo(() => User, { foreignKey: "creatorId" })
  creator: User;
}
