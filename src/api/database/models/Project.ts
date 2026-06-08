import {
  Column,
  Table,
  Model,
  ForeignKey,
  AllowNull,
  Index,
  BelongsTo,
  DataType,
  Default,
} from "sequelize-typescript";
import { STRING, UUID, UUIDV4 } from "sequelize";
import User from "./User";
import { ProjectProfile } from "../../../shared/ProjectProfile";
import { ProjectStatus, ProjectVisibility } from "../../../shared/Project";

@Table
export default class Project extends Model {
  @Index
  @Default(UUIDV4)
  @Column({
    type: UUID,
    primaryKey: true,
  })
  id: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  ownerId: string;

  @AllowNull(false)
  @Column(STRING)
  title: string;

  @AllowNull(false)
  @Column(STRING)
  status: ProjectStatus;

  @AllowNull(false)
  @Column(STRING)
  visibility: ProjectVisibility;

  @Column(DataType.JSONB)
  profile: ProjectProfile | null;

  /**
   * Associations
   */

  @BelongsTo(() => User, { foreignKey: "ownerId" })
  owner: User;
}
