import {
  Column,
  Table,
  Model,
  PrimaryKey,
  IsUUID,
  Default,
  Unique,
  BelongsToMany,
  HasMany,
} from "sequelize-typescript";
import { CreationOptional, STRING, TEXT, UUID, UUIDV4 } from "sequelize";
import Fix from "../modelHelpers/Fix";
import User from "./User";
import OrganizationMentor from "./OrganizationMentor";
import OrganizationOwner from "./OrganizationOwner";

@Table
@Fix
class Organization extends Model {
  @Unique
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  @Unique
  @Column(STRING)
  name: string;

  @Column(TEXT)
  description: string | null;

  /**
   * Associations
   */

  @BelongsToMany(() => User, {
    through: () => OrganizationMentor,
    foreignKey: "organizationId",
    otherKey: "mentorId",
  })
  mentors: User[];

  @HasMany(() => OrganizationMentor)
  organizationMentors: OrganizationMentor[];

  @BelongsToMany(() => User, {
    through: () => OrganizationOwner,
    foreignKey: "organizationId",
    otherKey: "ownerId",
  })
  owners: User[];

  @HasMany(() => OrganizationOwner)
  organizationOwners: OrganizationOwner[];
}

export default Organization;
