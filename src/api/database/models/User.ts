import type {
  InferAttributes,
  InferCreationAttributes, NonAttribute,
} from "sequelize";
import {
  AllowNull,
  BelongsToMany,
  Column,
  Table,
  Unique,
} from "sequelize-typescript";
import Fix from "../modelHelpers/Fix";
import ParanoidModel from "../modelHelpers/ParanoidModel";
import { DATE, JSONB, STRING } from "sequelize";
import ZodColumn from "../modelHelpers/ZodColumn";
import Role, { zRoles } from "../../../shared/Role";
import Group from "./Group";
import GroupUser from "./GroupUser";

@Table({ tableName: "users", modelName: "user" })
@Fix
class User extends ParanoidModel<
  InferAttributes<User>,
  InferCreationAttributes<User>
  > {
  @Column(STRING)
  name: string;

  @Column(STRING)
  pinyin: string;

  @Unique
  @Column(STRING)
  email: string;

  @Unique
  @Column(STRING)
  clientId: string;

  @ZodColumn(JSONB, zRoles)
  roles: Role[];

  @BelongsToMany(() => Group, { through: () => GroupUser })
  groups: NonAttribute<Group[]>;

  @AllowNull(true)
  @Column(DATE)
  consentFormAcceptedAt: Date | null;
}

export default User;
