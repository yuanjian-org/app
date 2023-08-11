import {
  Column,
  Table,
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
import ZodColumn from "../modelHelpers/ZodColumn";
import Interview from "./Interview";
import Group from "./Group";
import { InterviewType, zInterviewType } from "../../../shared/InterviewType";

@Table({
  paranoid: true,
})
class Calibration extends Model {
  @Unique
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  @AllowNull(false)
  @ZodColumn(STRING, zInterviewType)
  type: InterviewType;

  @AllowNull(false)
  @Column(STRING)
  name: string;

  /**
   * Associations
   */

  @HasMany(() => Interview)
  interviews: Interview[];

  @HasOne(() => Group)
  group: Group;
}

export default Calibration;
