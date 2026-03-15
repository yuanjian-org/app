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
import User from "./User";
import OrgMentor from "./OrgMentor";
import OrgOwner from "./OrgOwner";

@Table
class Org extends Model {
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
    through: () => OrgMentor,
    foreignKey: "orgId",
    otherKey: "mentorId",
  })
  mentors: User[];

  @HasMany(() => OrgMentor)
  orgMentors: OrgMentor[];

  @BelongsToMany(() => User, {
    through: () => OrgOwner,
    foreignKey: "orgId",
    otherKey: "ownerId",
  })
  owners: User[];

  @HasMany(() => OrgOwner)
  orgOwners: OrgOwner[];
}

export default Org;
