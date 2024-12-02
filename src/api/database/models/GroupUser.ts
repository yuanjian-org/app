import type {
  CreationOptional,
} from "sequelize";
import {
  Column,
  ForeignKey,
  Model,
  Table,
  BelongsTo,
  Default,
  IsUUID,
  Unique,
  PrimaryKey
} from "sequelize-typescript";
import Fix from "../modelHelpers/Fix";
import { UUID, UUIDV4 } from "sequelize";
import User from "./User";
import Group from "./Group";


@Table({
  tableName: "group_users",
  modelName: "group_user",
})
@Fix
class GroupUser extends Model {
  @Unique
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  @Column(UUID)
  @ForeignKey(() => User)
  userId: string;

  @Column(UUID)
  @ForeignKey(() => Group)
  groupId: string;

  /**
   * Associations
   */

  @BelongsTo(() => User)
  user: User;

  @BelongsTo(() => Group)
  group: Group;
}

export default GroupUser;
