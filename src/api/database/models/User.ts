import type {
  InferAttributes,
  InferCreationAttributes, NonAttribute,
} from "sequelize";
import {
  AllowNull,
  BelongsToMany,
  Column,
  HasMany,
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
import Partnership from "./Partnership";

@Table({ tableName: "users", modelName: "user" })
@Fix
class User extends ParanoidModel<
  InferAttributes<User>,
  InferCreationAttributes<User>
  > {
  // Always use `formatUserName` to display user names.
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

  // TODO chaneg to use array type
  @ZodColumn(JSONB, zRoles)
  roles: Role[];

  @BelongsToMany(() => Group, { through: () => GroupUser })
  groups: NonAttribute<Group[]>;

  @AllowNull(true)
  @Column(DATE)
  consentFormAcceptedAt: Date | null;

  // A mentee can have multiple mentors, although commonly just one.
  @HasMany(() => Partnership, { foreignKey: 'menteeId' })
  menteeOf: NonAttribute<Partnership>;

  @HasMany(() => Partnership, { foreignKey: 'mentorId' })
  mentorOf: NonAttribute<Partnership>;
}

export default User;
