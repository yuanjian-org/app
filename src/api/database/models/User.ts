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
  BelongsTo,
  HasOne,
} from "sequelize-typescript";
import Fix from "../modelHelpers/Fix";
import { ARRAY, DATE, INTEGER, JSONB, Op, STRING, UUID, UUIDV4 } from "sequelize";
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
import MergeToken from "./MergeToken";

@Table({
  tableName: "users",
  modelName: "user"
})
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

  // Only uesrs with the Volutneer role can set up urls. A user doesn't lose
  // the url after they are no longer a volunteer.
  @Unique
  @Column(STRING)
  url: string | null;

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

  // TODO: move into `state` column
  @Column(DATE)
  consentFormAcceptedAt: string | null;
 
  // TODO: move into `state` column
  @Column(DATE)
  menteeInterviewerTestLastPassedAt: string | null;

  // User defined WeChat ID, which is different from WeChat OpenID and UnionID
  // and is not provided by WeChat auth API.
  // Store it here as opposed to inside the profile column because in some cases
  // we need to redact this field (and email field).
  @Column(STRING)
  wechat: string | null;

  // Used by WeChat auth. See WeChatProvider.ts and docs/WeChat.md.
  @Unique
  @Column(STRING)
  wechatUnionId: string | null;

  @ZodColumn(JSONB, z.record(z.string(), z.any()).nullish())
  menteeApplication: Record<string, any> | null;

  @ZodColumn(JSONB, z.record(z.string(), z.any()).nullish())
  volunteerApplication: Record<string, any> | null;

  @ZodColumn(JSONB, zUserProfile.nullable())
  profile: UserProfile | null;

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

  @HasMany(() => User, { foreignKey: 'mergedTo' })
  mergedFrom: User[];

  @HasOne(() => MergeToken)
  mergeToken: MergeToken | null;

  // TODO: rename `mergedTo` to `mergedToId` and rename this one to `mergedTo`
  @BelongsTo(() => User, { foreignKey: 'mergedTo' })
  mergedToUser: User | null;

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
