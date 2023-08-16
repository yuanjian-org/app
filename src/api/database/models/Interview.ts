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
  BeforeDestroy,
} from "sequelize-typescript";
import { CreationOptional, STRING, UUID, UUIDV4 } from "sequelize";
import User from "./User";
import ZodColumn from "../modelHelpers/ZodColumn";
import InterviewFeedback from "./InterviewFeedback";
import Group from "./Group";
import { InterviewType, zInterviewType } from "../../../shared/InterviewType";
import Calibration from "./Calibration";

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

  @ForeignKey(() => Calibration)
  @Column(UUID)
  calibrationId: string | null;

  /**
   * Associations
   */
  @BelongsTo(() => Calibration)
  calibration: Calibration | null;

  @BelongsTo(() => User)
  interviewee: User;

  @HasMany(() => InterviewFeedback)
  feedbacks: InterviewFeedback[];

  @HasOne(() => Group)
  group: Group;

  @BeforeDestroy
  static async cascadeDestroy(i: Interview, options: any) {
    const promises1 = (await InterviewFeedback.findAll({
      where: { interviewId: i.id }
    })).map(async feedback => { await feedback.destroy(options); });

    const promises2 = (await Group.findAll({
      where: { interviewId: i.id }
    })).map(async g => { await g.destroy(options); });

    await Promise.all([...promises1, ...promises2]);
  }
}

export default Interview;
