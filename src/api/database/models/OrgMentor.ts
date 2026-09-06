import { Column, ForeignKey, Table, BelongsTo } from "sequelize-typescript";
import { UUID } from "sequelize";
import User from "./User";
import Org from "./Org";
import OrgUserRole from "./OrgUserRole";

@Table({
  indexes: [
    {
      unique: true,
      fields: ["orgId", "mentorId"],
    },
  ],
})
class OrgMentor extends OrgUserRole {
  @ForeignKey(() => User)
  @Column(UUID)
  mentorId: string;

  /**
   * Associations
   */

  @BelongsTo(() => Org)
  org: Org;

  @BelongsTo(() => User)
  mentor: User;
}

export default OrgMentor;
