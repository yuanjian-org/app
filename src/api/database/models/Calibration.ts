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
import { BOOLEAN, CreationOptional, STRING, UUID, UUIDV4 } from "sequelize";
import ZodColumn from "../modelHelpers/ZodColumn";
import Interview from "./Interview";
import Group from "./Group";
import { InterviewType, zInterviewType } from "../../../shared/InterviewType";

@Table({
  paranoid: true,

})
class Calibration extends Model {
  @Unique('id_type_unique')
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  @Unique('id_type_unique')
  @AllowNull(false)
  @ZodColumn(STRING, zInterviewType)
  type: InterviewType;

  @AllowNull(false)
  @Unique
  @Column(STRING)
  name: string;

  @AllowNull(false)
  @Column(BOOLEAN)
  active: boolean;

  /**
   * Associations
   */

  @HasMany(() => Interview)
  interviews: Interview[];

  @HasOne(() => Group)
  group: Group;
}

export default Calibration;
