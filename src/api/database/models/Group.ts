import type {
  InferAttributes,
  InferCreationAttributes, NonAttribute,
} from "sequelize";
import {
  AllowNull,
  BeforeDestroy,
  BelongsToMany,
  Column, HasMany,
  Table,
} from "sequelize-typescript";
import Fix from "../modelHelpers/Fix";
import ParanoidModel from "../modelHelpers/ParanoidModel";
import { STRING } from "sequelize";
import GroupUser from "./GroupUser";
import User from "./User";
import Transcript from "./Transcript";

@Table({ tableName: "groups", modelName: "group" })
@Fix
class Group extends ParanoidModel<
  InferAttributes<Group>,
  InferCreationAttributes<Group>
  > {

  @AllowNull(true)
  @Column(STRING)
  name: string | null;

  @AllowNull(true)
  @Column(STRING)
  meetingLink: string | null;

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

    // For some reason the two Promise.all can't be moved together. Otherwise errors like
    // "commit has been called on this transaction" would occur.
    Promise.all(promises1);

    const promises2 = (await Transcript.findAll({
      where: { groupId: group.id }
    })).map(async t => { await t.destroy(options); });

    Promise.all(promises2);
  }
}

export default Group;
