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
import Interview from "./Interview";
import { FeedbackDeprecated, zFeedbackDeprecated } from "../../../shared/InterviewFeedback";

// TODO: rename to Interviewer
@Table
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

  @ZodColumn(JSONB, zFeedbackDeprecated.nullable())
  feedback: FeedbackDeprecated | null;

  @Column(DATE)
  feedbackUpdatedAt: string | null;

  /**
   * Associations
   */

  @BelongsTo(() => User)
  interviewer: User;

  @BelongsTo(() => Interview)
  interview: Interview;
}

export default InterviewFeedback;
