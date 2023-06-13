import type {
  InferAttributes,
  InferCreationAttributes, NonAttribute,
} from "sequelize";
import {
  BelongsToMany,
  Column, HasMany,
  Table,
} from "sequelize-typescript";
import Fix from "../modelHelpers/Fix";
import ParanoidModel from "../modelHelpers/ParanoidModel";
import { STRING } from "sequelize";
import GroupUser from "./GroupUser";
import User from "./User";

@Table({ tableName: "groups", modelName: "group" })
@Fix
class Group extends ParanoidModel<
  InferAttributes<Group>,
  InferCreationAttributes<Group>
  > {

  @Column({
    type: STRING,
    allowNull: true
  })
  meetingLink: string | null;

  @BelongsToMany(() => User, { through: () => GroupUser })
  users: NonAttribute<User[]>;

  @HasMany(() => GroupUser)
  groupUsers: NonAttribute<GroupUser[]>;
}

export default Group;
