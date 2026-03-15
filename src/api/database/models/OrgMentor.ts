import {
  Column,
  ForeignKey,
  Model,
  Table,
  BelongsTo,
  Default,
  IsUUID,
  Unique,
  PrimaryKey,
} from "sequelize-typescript";
import { CreationOptional, UUID, UUIDV4 } from "sequelize";
import User from "./User";
import Org from "./Org";

@Table({
  indexes: [
    {
      unique: true,
      fields: ["orgId", "mentorId"],
    },
  ],
})
class OrgMentor extends Model {
  @Unique
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  @ForeignKey(() => Org)
  @Column(UUID)
  orgId: string;

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
