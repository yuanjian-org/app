import type {
  InferAttributes,
  InferCreationAttributes,
} from "sequelize";
import {
  AllowNull,
  BeforeBulkDestroy,
  BeforeDestroy,
  Column,
  Index,
  Table,
  Unique,
} from "sequelize-typescript";
import Fix from "../modelHelpers/Fix";
import ParanoidModel from "../modelHelpers/ParanoidModel";
import { DATE, JSONB, Op, STRING } from "sequelize";
import ZodColumn from "../modelHelpers/ZodColumn";
import Role, { zRoles } from "../../../shared/Role";
import z from "zod";
import { toPinyin } from "../../../shared/strings";
import GroupUser from "./GroupUser";
import Partnership from "./Partnership";


@Table({ tableName: "users", modelName: "user" })
@Fix
class User extends ParanoidModel<
  InferAttributes<User>,
  InferCreationAttributes<User>
  > {
  // Always use `formatUserName` to display user names.
  // TODO: either add `AllowNull(false)` or `| null` to both name and pinyin columns.
  @Column(STRING)
  name: string;

  @Column(STRING)
  pinyin: string;

  @Unique
  @AllowNull(false)
  @Column(STRING)
  email: string;

  @Index({
    using: 'gin'
  })
  // TODO chaneg to use array type
  @AllowNull(false)
  @ZodColumn(JSONB, zRoles)
  roles: Role[];

  @Column(DATE)
  consentFormAcceptedAt: Date | null;

  @Column(STRING)
  sex: string | null;

  @Column(STRING)
  wechat: string | null;

  @ZodColumn(JSONB, z.record(z.string(), z.any()).nullable())
  menteeApplication: object | null;

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

export async function createUser(fields: any) {
  const f = structuredClone(fields);
  if (!("name" in f)) f.name = "";
  f.pinyin = toPinyin(f.name);
  return await User.create(f);
}
