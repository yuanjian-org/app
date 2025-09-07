import type { CreationOptional } from "sequelize";
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
  BelongsTo,
} from "sequelize-typescript";
import Fix from "../modelHelpers/Fix";
import {
  ARRAY,
  DATE,
  INTEGER,
  JSONB,
  Op,
  STRING,
  UUID,
  UUIDV4,
} from "sequelize";
import ZodColumn from "../modelHelpers/ZodColumn";
import Role, { zRoles } from "../../../shared/Role";
import z from "zod";
import Interview from "./Interview";
import GroupUser from "./GroupUser";
import Mentorship from "./Mentorship";
import { MenteeStatus, zMenteeStatus } from "../../../shared/MenteeStatus";
import { UserPreference, zUserPreference } from "../../../shared/User";
import { UserProfile, zUserProfile } from "../../../shared/UserProfile";
import { zUserState, UserState } from "../../../shared/UserState";

@Table({
  tableName: "users",
  modelName: "user",
})
@Fix
class User extends Model {
  @Unique
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  // Standard E.164 phone number format such as "+8613800138000".
  // This field uniquely identifies a person. See /s/why-phone.
  // It is also the key to merge accounts. See phones.ts.
  @Unique
  @Column(STRING)
  phone: string | null;

  @Unique
  @Column(STRING)
  email: string | null;

  // Used by WeChat auth. See WeChatProvider.ts and docs/WeChat.md.
  @Unique
  @Column(STRING)
  wechatUnionId: string | null;

  // Always use `formatUserName` to display user names.
  @Column(STRING)
  name: string | null;

  @Column(STRING)
  pinyin: string | null;

  // Only uesrs with the Volutneer role can set up urls. A user doesn't lose
  // the url after they are no longer a volunteer.
  @Unique
  @Column(STRING)
  url: string | null;

  // User defined WeChat ID, which is different from WeChat OpenID and UnionID
  // and is not provided by WeChat auth API.
  // Store it here as opposed to inside the profile column because in some cases
  // we need to redact this field (and email field).
  @Column(STRING)
  wechat: string | null;

  @Index({
    using: "gin",
  })
  @AllowNull(false)
  @Default([])
  @ZodColumn(ARRAY(STRING), zRoles)
  roles: Role[];

  @ZodColumn(JSONB, z.record(z.string(), z.any()).nullish())
  menteeApplication: Record<string, any> | null;

  @ZodColumn(JSONB, z.record(z.string(), z.any()).nullish())
  volunteerApplication: Record<string, any> | null;

  @ZodColumn(JSONB, zUserProfile.nullable())
  profile: UserProfile | null;

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

  @ZodColumn(JSONB, zUserState.nullable())
  state: UserState | null;

  @Column(UUID)
  @ForeignKey(() => User)
  mergedTo: string | null;

  @Column(INTEGER)
  likes: number;

  @Column(INTEGER)
  kudos: number;

  // Managed by next-auth
  @Column(DATE)
  emailVerified: Date | null;

  // Password hash for email/password login, nullable for users who use other
  // providers.
  @Column(STRING)
  password: string | null;

  // Password reset token
  @Column(STRING)
  resetToken: string | null;

  @Column(DATE)
  resetTokenExpiresAt: Date | null;

  /**
   * Associations
   */

  @HasMany(() => Interview)
  interviews: Interview[];

  @HasMany(() => Mentorship, { foreignKey: "mentorId" })
  mentorshipsAsMentor: Mentorship[];

  @HasMany(() => Mentorship, { foreignKey: "menteeId" })
  mentorshipsAsMentee: Mentorship[];

  @BelongsTo(() => User, { foreignKey: "pointOfContactId" })
  pointOfContact: User | null;

  // TODO: rename `mergedTo` to `mergedToId` and rename this one to `mergedTo`
  @BelongsTo(() => User, { foreignKey: "mergedTo" })
  mergedToUser: User | null;

  @BeforeDestroy
  static async cascadeDelete(user: User, options: any) {
    await GroupUser.destroy({
      where: { userId: user.id },
      ...options,
    });
    await Mentorship.destroy({
      where: {
        [Op.or]: [{ menteeId: user.id }, { mentorId: user.id }],
      },
      ...options,
    });
  }
}

export default User;
