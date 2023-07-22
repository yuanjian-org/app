import {
  Column,
  ForeignKey,
  Table,
  BelongsTo,
  Model,
  PrimaryKey,
  IsUUID,
  Default,
  HasMany,
  AllowNull,
  Unique,
  HasOne,
} from "sequelize-typescript";
import { CreationOptional, STRING, UUID, UUIDV4 } from "sequelize";
import User from "./User";
import ZodColumn from "../modelHelpers/ZodColumn";
import z from "zod";
import InterviewFeedback from "./InterviewFeedback";
import Group from "./Group";

const zInterviewType = z.enum(["Mentee", "Mentor"]);
type InterviewType = z.TypeOf<typeof zInterviewType>;

@Table({
  paranoid: true,
})
class Interview extends Model {
  @Unique
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  @AllowNull(false)
  @ZodColumn(STRING, zInterviewType)
  type: InterviewType;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  intervieweeId: string;

  @BelongsTo(() => User)
  interviewee: User;

  @HasMany(() => InterviewFeedback)
  feedbacks: InterviewFeedback;

  @HasOne(() => Group)
  group: Group;
}

export default Interview;
