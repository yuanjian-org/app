import {
  AllowNull,
  BelongsTo,
  Column,
  Default,
  ForeignKey,
  Model,
  Table,
} from "sequelize-typescript";
import { STRING, TEXT, UUID, UUIDV4 } from "sequelize";
import User from "./User";
import Project from "./Project";

@Table({
  indexes: [
    {
      fields: ["projectId", "applicantId"],
      unique: true,
    },
  ],
})
export default class ProjectApplication extends Model {
  @Default(UUIDV4)
  @Column({ type: UUID, primaryKey: true })
  id: string;

  @ForeignKey(() => Project)
  @AllowNull(false)
  @Column(UUID)
  projectId: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  applicantId: string;

  @AllowNull(false)
  @Column(TEXT)
  content: string;

  @AllowNull(false)
  @Default("Pending")
  @Column(STRING)
  status: string;

  @BelongsTo(() => Project, { foreignKey: "projectId" })
  project: Project;

  @BelongsTo(() => User, { foreignKey: "applicantId" })
  applicant: User;
}
