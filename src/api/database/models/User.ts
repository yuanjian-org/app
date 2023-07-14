import type {
  InferAttributes,
  InferCreationAttributes, NonAttribute,
} from "sequelize";
import {Op} from 'sequelize';
import {
  AllowNull,
  BeforeDestroy,
  BelongsToMany,
  Column,
  HasMany,
  Table,
  Unique,
} from "sequelize-typescript";
import Fix from "../modelHelpers/Fix";
import ParanoidModel from "../modelHelpers/ParanoidModel";
import { DATE, JSONB, STRING, UUID } from "sequelize";
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

  @BeforeDestroy
  static async cascadeDestory( user: User, options: any){
    const promises1 = (await GroupUser.findAll({
      where: { userId: user.id }
    })).map( async gu => {await gu.destroy(options); });

    const promises2 = (await Partnership.findAll({
      where: { 
        [Op.or]: [{menteeId: user.id}, {mentorId: user.id}] 
      }
    })).map(async p => { await p.destroy(options); });
    
    await Promise.all([...promises1, promises2]);
  }
}

export default User;
