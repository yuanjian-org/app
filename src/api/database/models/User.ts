import type {
  CreationOptional,
} from "sequelize";
import {
  AllowNull,
  BeforeDestroy,
  Column,
  HasMany,
  Index,
  Table,
  Unique,
  Model,
  Default,
  IsUUID,
  PrimaryKey,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Fix from "../modelHelpers/Fix";
import { ARRAY, DATE, JSONB, Op, STRING, UUID, UUIDV4 } from "sequelize";
import ZodColumn from "../modelHelpers/ZodColumn";
import Role, { zRoles } from "../../../shared/Role";
import z from "zod";
import { toPinyin } from "../../../shared/strings";
import Interview from "./Interview";
import GroupUser from "./GroupUser";
import Mentorship from "./Mentorship";
import { MenteeStatus, zMenteeStatus } from "../../../shared/MenteeStatus";
import { UserPreference, zUserPreference } from "../../../shared/User";
import { MentorProfile, zMentorProfile } from "../../../shared/MentorProfile";


@Table({ paranoid: true, tableName: "users", modelName: "user" })
@Fix
class User extends Model {
  @Unique
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  // Always use `formatUserName` to display user names.
  @Column(STRING)
  name: string | null;

  @Column(STRING)
  pinyin: string | null;

  @Unique
  @AllowNull(false)
  @Column(STRING)
  email: string;

  @Index({
    using: 'gin'
  })
  @AllowNull(false)
  @Default([])
  @ZodColumn(ARRAY(STRING), zRoles)
  roles: Role[];

  @Column(DATE)
  consentFormAcceptedAt: string | null;
 
  @Column(DATE)
  menteeInterviewerTestLastPassedAt: string | null;

  @Column(STRING)
  sex: string | null;

  @Column(STRING)
  wechat: string | null;

  @Column(STRING)
  city: string | null;

  @ZodColumn(JSONB, z.record(z.string(), z.any()).nullable())
  menteeApplication: Record<string, any> | null;

  @ZodColumn(JSONB, z.record(z.string(), z.any()).nullable())
  mentorApplication: Record<string, any> | null;

  @ZodColumn(JSONB, zMentorProfile.nullable())
  mentorProfile: MentorProfile | null;

  // The coach of the mentor. Non-null only if the user is a mentor (ie.
  // `mentorshipsAsMentor` is non-empty).
  @ForeignKey(() => User)
  @Column(UUID)
  coachId: string | null;

  // `null` represents "待审"
  @ZodColumn(STRING, zMenteeStatus.nullable())
  menteeStatus: MenteeStatus | null;

  @ForeignKey(() => User)
  @Column(UUID)
  pointOfContactId: string | null;

  @ZodColumn(STRING, z.string().nullable())
  pointOfContactNote: string | null;

  @ZodColumn(JSONB, zUserPreference.nullable())
  preference: UserPreference | null;

  // Managed by next-auth
  @Column(DATE)
  emailVerified: Date | null;

  // Managed by next-auth
  @Column(STRING)
  image: string | null;

  /**
   * Associations
   */

  @HasMany(() => Interview)
  interviews: Interview[];

  @HasMany(() => Mentorship, { foreignKey: 'mentorId' })
  mentorshipsAsMentor: Mentorship[];

  @HasMany(() => Mentorship, { foreignKey: 'menteeId' })
  mentorshipsAsMentee: Mentorship[];

  @BelongsTo(() => User, { foreignKey: 'coachId' })
  coach: User | null;

  @BelongsTo(() => User, { foreignKey: 'pointOfContactId' })
  pointOfContact: User | null;

  @BeforeDestroy
  static async cascadeDelete(user: User, options: any) {

      await GroupUser.destroy({
        where: { userId: user.id },
        ...options
      });
      await Mentorship.destroy({
        where: {
          [Op.or]: [{ menteeId: user.id }, { mentorId: user.id }]
        },
        ...options
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
