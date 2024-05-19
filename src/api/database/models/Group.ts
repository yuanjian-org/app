import type {
  CreationOptional,
} from "sequelize";
import {
  AllowNull,
  BeforeDestroy,
  BelongsToMany,
  Column, 
  Model,
  ForeignKey, 
  HasMany,
  Index,
  Table,
  Default,
  IsUUID,
  Unique,
  PrimaryKey
} from "sequelize-typescript";
import Fix from "../modelHelpers/Fix";
import { BOOLEAN, STRING, UUID, UUIDV4 } from "sequelize";
import GroupUser from "./GroupUser";
import User from "./User";
import Transcript from "./Transcript";
import Mentorship from "./Mentorship";
import Interview from "./Interview";
import Calibration from "./Calibration";
import Role from "shared/Role";

/**
 * A group is said to be "owned" if the mentorship or interview field is non-null.
 * Otherwise the group is said to be "unowned".
 * 
 * TODO: Add an index on `achived`
 */
@Table({
  paranoid: true,
  tableName: "groups",
  modelName: "group",
})
@Fix
class Group extends Model {
  @Unique
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  @Column(STRING)
  name: string | null;

  // A public group allows any registered user to visit the group page via the
  // group URL and join group meeting, and limits the access to group meeting
  // history to group users only.
  @AllowNull(false)
  @Default(false)
  @Column(BOOLEAN)
  public: boolean;

  // Archived groups won't show up in the UI. Reveal them by toggling the "Show
  // Archived Groups" option in the group management page.
  @AllowNull(false)
  @Default(false)
  @Column(BOOLEAN)
  archived: boolean;

  // A group is "owned" by a mentorship if this field is non-null.
  @ForeignKey(() => Mentorship)
  @Column(UUID)
  partnershipId: string | null;

  // A group is "owned" by an interview if this field is non-null.
  @ForeignKey(() => Interview)
  @Column(UUID)
  interviewId: string | null;

  // A group is "owned" by a calibration if this field is non-null.
  //
  // The index is used by getCalibrationAndCheckPermissionSafe()
  @Index  
  @ForeignKey(() => Calibration)
  @Column(UUID)
  calibrationId: string | null;

  // A group is "owned" by a mentor-coaching relationship if this field is non-null.
  @ForeignKey(() => User)
  @Column(UUID)
  coacheeId: string | null;
  
  /**
   * Associations
   */

  @BelongsToMany(() => User, { through: () => GroupUser })
  users: User[];

  @HasMany(() => GroupUser)
  groupUsers: GroupUser[];

  @HasMany(() => Transcript)
  transcripts: Transcript[];

  @BeforeDestroy
  static async cascadeDestroy(group: Group, options: any) {
    const promises1 = (await GroupUser.findAll({
      where: { groupId: group.id }
    })).map(async gu => { await gu.destroy(options); });

    const promises2 = (await Transcript.findAll({
      where: { groupId: group.id }
    })).map(async t => { await t.destroy(options); });

    await Promise.all([...promises1, ...promises2]);
  }
}

export default Group;
