import type {
  InferAttributes,
  InferCreationAttributes, NonAttribute,
} from "sequelize";
import {
  AllowNull,
  BelongsToMany,
  Column, HasMany,
  Table,
} from "sequelize-typescript";
import Fix from "../modelHelpers/Fix";
import ParanoidModel from "../modelHelpers/ParanoidModel";
import { STRING } from "sequelize";
import GroupUser from "./GroupUser";
import User from "./User";
import Transcript from "./Transcript";

@Table({ tableName: "groups", modelName: "group" })
@Fix
class Group extends ParanoidModel<
  InferAttributes<Group>,
  InferCreationAttributes<Group>
  > {

  @AllowNull(true)
  @Column(STRING)
  name: string | null;

  @AllowNull(true)
  @Column(STRING)
  meetingLink: string | null;

  @BelongsToMany(() => User, { through: () => GroupUser })
  users: NonAttribute<User[]>;

  @HasMany(() => GroupUser)
  groupUsers: NonAttribute<GroupUser[]>;

  @HasMany(() => Transcript)
  transcripts: NonAttribute<Transcript[]>;
}

export default Group;
