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
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { BOOLEAN, CreationOptional, STRING, UUID, UUIDV4 } from "sequelize";
import ZodColumn from "../modelHelpers/ZodColumn";
import Interview from "./Interview";
import Group from "./Group";
import User from "./User";
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

  @ForeignKey(() => User)
  @Column(UUID)
  managerId: string | null;

  @BelongsTo(() => User, { foreignKey: 'managerId' })
  manager: User | null;

  /**
   * Associations
   */

  @HasMany(() => Interview)
  interviews: Interview[];

  @HasOne(() => Group)
  group: Group;
}

export default Calibration;
