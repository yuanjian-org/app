import {
  Column,
  ForeignKey,
  Table,
  BelongsTo,
  Model,
  PrimaryKey,
  IsUUID,
  Default,
  AllowNull,
} from "sequelize-typescript";
import { CreationOptional, STRING, UUID, UUIDV4 } from "sequelize";
import Partnership from "./Partnership";

/**
 * An assessment is an evaluation of a mentoring partnership.
 * TODO: Rename to MentorshipAssessment.
 */
@Table({
  paranoid: true,
})
class Assessment extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  @ForeignKey(() => Partnership)
  @Column(UUID)
  partnershipId: string;

  @AllowNull
  @Column(STRING(1 * 1024 * 1024))
  summary: string | null;
}

export default Assessment;
