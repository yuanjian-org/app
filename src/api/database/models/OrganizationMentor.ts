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
import Fix from "../modelHelpers/Fix";
import User from "./User";
import Organization from "./Organization";

@Table({
  indexes: [
    {
      unique: true,
      fields: ["organizationId", "mentorId"],
    },
  ],
})
@Fix
class OrganizationMentor extends Model {
  @Unique
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  @ForeignKey(() => Organization)
  @Column(UUID)
  organizationId: string;

  @ForeignKey(() => User)
  @Column(UUID)
  mentorId: string;

  /**
   * Associations
   */

  @BelongsTo(() => Organization)
  organization: Organization;

  @BelongsTo(() => User)
  mentor: User;
}

export default OrganizationMentor;
