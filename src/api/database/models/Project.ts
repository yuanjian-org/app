import {
  AllowNull,
  BelongsTo,
  Column,
  Default,
  ForeignKey,
  Index,
  Model,
  Table,
} from "sequelize-typescript";
import { BOOLEAN, STRING, TEXT, UUID, UUIDV4 } from "sequelize";
import User from "./User";

@Table
export default class Project extends Model {
  @Default(UUIDV4)
  @Column({ type: UUID, primaryKey: true })
  id: string;

  @Index
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  creatorId: string;

  @AllowNull(false)
  @Column(STRING)
  title: string;

  @AllowNull(false)
  @Column(TEXT)
  background: string;

  @AllowNull(false)
  @Column(TEXT)
  description: string;

  @AllowNull(false)
  @Column(STRING)
  videoUrl: string;

  @AllowNull(false)
  @Column(TEXT)
  studentPersona: string;

  @AllowNull(false)
  @Default(false)
  @Column(BOOLEAN)
  requireLogin: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(BOOLEAN)
  isPublished: boolean;

  @BelongsTo(() => User, { foreignKey: "creatorId" })
  creator: User;
}
