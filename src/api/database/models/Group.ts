import type {
  InferAttributes,
  InferCreationAttributes, NonAttribute,
} from "sequelize";
import {
  AllowNull,
  BeforeDestroy,
  BelongsToMany,
  Column, ForeignKey, HasMany,
  Index,
  Table,
} from "sequelize-typescript";
import Fix from "../modelHelpers/Fix";
import ParanoidModel from "../modelHelpers/ParanoidModel";
import { STRING, UUID } from "sequelize";
import GroupUser from "./GroupUser";
import User from "./User";
import Transcript from "./Transcript";
import Partnership from "./Partnership";
import Interview from "./Interview";
import Calibration from "./Calibration";

/**
 * A group is said to be "owned" if the partnership or interview field is non-null.
 * Otherwise the group is said to be "unowned".
 */
@Table({ tableName: "groups", modelName: "group" })
@Fix
class Group extends ParanoidModel<
  InferAttributes<Group>,
  InferCreationAttributes<Group>
  > {

  @AllowNull(true)
  @Column(STRING)
  name: string | null;

  // A group is said to be "owned" by a partnership if this field is non-null.
  @ForeignKey(() => Partnership)
  @Column(UUID)
  partnershipId: string | null;

  // A group is said to be "owned" by an interview if this field is non-null.
  @ForeignKey(() => Interview)
  @Column(UUID)
  interviewId: string | null;

  // A group is said to be "owned" by a calibration if this field is non-null.
  //
  // The index is used by getCalibrationAndCheckPermissionSafe()
  @Index  
  @ForeignKey(() => Calibration)
  @Column(UUID)
  calibrationId: string | null;

  /**
   * Associations
   */

  @BelongsToMany(() => User, { through: () => GroupUser })
  users: NonAttribute<User[]>;

  @HasMany(() => GroupUser)
  groupUsers: NonAttribute<GroupUser[]>;

  @HasMany(() => Transcript)
  transcripts: NonAttribute<Transcript[]>;

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
