import type {
  InferAttributes,
  InferCreationAttributes, NonAttribute,
} from "sequelize";
import {
  Column, ForeignKey,
  Table,
  BelongsTo
} from "sequelize-typescript";
import Fix from "../modelHelpers/Fix";
import ParanoidModel from "../modelHelpers/ParanoidModel";
import { STRING, UUID } from "sequelize";
import User from "./User";
import Group from "./Group";

@Table({ tableName: "group_users", modelName: "group_user" })
@Fix
class GroupUser extends ParanoidModel<
  InferAttributes<GroupUser>,
  InferCreationAttributes<GroupUser>
  > {
  @Column(UUID)
  @ForeignKey(() => User)
  userId: string;

  @BelongsTo(() => User)
  user: NonAttribute<User>;

  @Column(UUID)
  @ForeignKey(() => Group)
  groupId: string;

  @BelongsTo(() => Group)
  group: NonAttribute<Group>;
}

export default GroupUser;
