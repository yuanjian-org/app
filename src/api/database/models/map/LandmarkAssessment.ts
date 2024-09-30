import {
  Column,
  Table,
  Model,
  ForeignKey,
} from "sequelize-typescript";
import { UUID, STRING, INTEGER } from "sequelize";
import User from "../User";
import ZodColumn from "../../modelHelpers/ZodColumn";
import { zLandmarkScore, LandmarkScore } from "../../../../shared/Map";

@Table({
  indexes: [
    {
      unique: true,
      // Composite key on userId, landmark, createdAt
      fields: ['userId', 'landmark', 'createdAt'],
    },
  ],
})
class LandmarkAssessment extends Model {
  @ForeignKey(() => User)
  @Column(UUID)
  userId: string;

  @ForeignKey(() => User)
  @Column(UUID)
  assessorId: string | null;

  @Column(STRING)
  landmark: string;

  @ZodColumn(INTEGER, zLandmarkScore)
  score: LandmarkScore;

  @Column(STRING)
  markdown: string | null;
}

export default LandmarkAssessment;
