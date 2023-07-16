import type {
  InferAttributes,
  InferCreationAttributes, NonAttribute,
} from "sequelize";
import {
  AllowNull,
  BeforeDestroy,
  BelongsTo,
  BelongsToMany,
  Column, ForeignKey, HasMany,
  Table,
} from "sequelize-typescript";
import Fix from "../modelHelpers/Fix";
import ParanoidModel from "../modelHelpers/ParanoidModel";
import { STRING, UUID } from "sequelize";
import GroupUser from "./GroupUser";
import User from "./User";
import Transcript from "./Transcript";
import Partnership from "./Partnership";

/**
 * A group is said to be "owned" by a partnership if the partnership field is non-null. Otherwise the group is said to
 * be "unowned".
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

  @BelongsToMany(() => User, { through: () => GroupUser })
  users: NonAttribute<User[]>;

  @HasMany(() => GroupUser)
  groupUsers: NonAttribute<GroupUser[]>;

  @HasMany(() => Transcript)
  transcripts: NonAttribute<Transcript[]>;

  // A group is said to be "owned" by a partnership if this field is non-null.
  @ForeignKey(() => Partnership)
  @Column(UUID)
  partnershipId: string | null;

  @BelongsTo(() => Partnership)
  partnership: NonAttribute<Partnership>;

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
