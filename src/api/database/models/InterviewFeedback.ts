import {
  Column,
  ForeignKey,
  Table,
  Model,
  PrimaryKey,
  IsUUID,
  Default,
  AllowNull,
  Unique,
  BelongsTo,
} from "sequelize-typescript";
import { CreationOptional, DATE, JSONB, UUID, UUIDV4 } from "sequelize";
import User from "./User";
import ZodColumn from "../modelHelpers/ZodColumn";
import z from "zod";
import Interview from "./Interview";

@Table({
  paranoid: true,
})
class InterviewFeedback extends Model {
  @Unique
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  @ForeignKey(() => Interview)
  @AllowNull(false)
  @Column(UUID)
  interviewId: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  interviewerId: string;

  @ZodColumn(JSONB, z.record(z.string(), z.any()).nullable())
  feedback: object | null;

  @Column(DATE)
  feedbackCreatedAt: string | null;

  /**
   * Associations
   */

  @BelongsTo(() => User)
  interviewer: User;
}

export default InterviewFeedback;
