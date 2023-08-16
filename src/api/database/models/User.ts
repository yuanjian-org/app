import type {
  InferAttributes,
  InferCreationAttributes,
  NonAttribute,
} from "sequelize";
import {
  AllowNull,
  BeforeBulkDestroy,
  BeforeDestroy,
  Column,
  HasMany,
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
import Interview from "./Interview";
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

  // TODO use array type
  @Index({
    using: 'gin'
  })
  @AllowNull(false)
  @ZodColumn(JSONB, zRoles)
  roles: Role[];

  // TODO use string type
  @Column(DATE)
  consentFormAcceptedAt: Date | null;

  @Column(DATE)
  menteeInterviewerTestLastPassedAt: string | null;

  @Column(STRING)
  sex: string | null;

  @Column(STRING)
  wechat: string | null;

  @ZodColumn(JSONB, z.record(z.string(), z.any()).nullable())
  menteeApplication: Record<string, any> | null;

  /**
   * Associations
   */

  @HasMany(() => Interview)
  interviews: NonAttribute<Interview[]>;
  



  @BeforeDestroy
  static async cascadeSoftDelete(user: User, options: any) {

    const moment = require('moment-timezone');
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss.SSSZ');

    await GroupUser.update(
      { deletedAt: timestamp },
      { where: { userId: user.id } }
    );

    await Partnership.update(
      { deletedAt: timestamp },
      { where: {
          [Op.or]: [{ menteeId: user.id }, { mentorId: user.id }]
        }
      });
  }


}

export default User;

export async function createUser(fields: any, mode: "create" | "upsert" = "create"): Promise<User> {
  const f = structuredClone(fields);
  if (!("name" in f)) f.name = "";
  f.pinyin = toPinyin(f.name);
  return mode == "create" ? await User.create(f) : (await User.upsert(f))[0];
}
