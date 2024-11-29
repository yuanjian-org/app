import {
  Column,
  ForeignKey,
  Table,
  Model,
  PrimaryKey,
  IsUUID,
  Default,
  AllowNull,
} from "sequelize-typescript";
import { CreationOptional, STRING, UUID, UUIDV4 } from "sequelize";
import Mentorship from "./Mentorship";

/**
 * An assessment is an evaluation of a mentorship.
 * TODO: Rename to MentorshipAssessment.
 */
@Table
class Assessment extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  @ForeignKey(() => Mentorship)
  @AllowNull(false)
  @Column(UUID)
  partnershipId: string;

  @Column(STRING(1 * 1024 * 1024))
  summary: string | null;
}

export default Assessment;
