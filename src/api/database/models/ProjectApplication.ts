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
import Project from "./Project";

export type ProjectApplicationStatus = "已通过" | "已拒绝" | null;

@Table
export default class ProjectApplication extends Model {
  @Index
  @Default(UUIDV4)
  @Column({
    type: UUID,
    primaryKey: true,
  })
  id: string;

  @ForeignKey(() => Project)
  @AllowNull(false)
  @Column(UUID)
  projectId: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  userId: string;

  @AllowNull(true)
  @Column(STRING)
  status: ProjectApplicationStatus;

  @Column(DataType.JSONB)
  application: Record<string, any> | null;

  /**
   * Associations
   */

  @BelongsTo(() => Project, { foreignKey: "projectId" })
  project: Project;

  @BelongsTo(() => User, { foreignKey: "userId" })
  user: User;
}
