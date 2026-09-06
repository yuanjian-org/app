import { Column, ForeignKey, Table, BelongsTo } from "sequelize-typescript";
import { UUID } from "sequelize";
import User from "./User";
import Org from "./Org";
import OrgUserRole from "./OrgUserRole";

@Table({
  indexes: [
    {
      unique: true,
      fields: ["orgId", "ownerId"],
    },
  ],
})
class OrgOwner extends OrgUserRole {
  @ForeignKey(() => User)
  @Column(UUID)
  ownerId: string;

  /**
   * Associations
   */

  @BelongsTo(() => Org)
  org: Org;

  @BelongsTo(() => User)
  owner: User;
}

export default OrgOwner;
