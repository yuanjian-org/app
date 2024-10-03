import {
  Column,
  Table,
  Model,
  ForeignKey,
  BelongsTo,
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

  // If assessorId (assessor) is null, the landmark assessment is self-evaluated by the user; 
  // otherwise, it is evaluated by others.
  @ForeignKey(() => User)
  @Column(UUID)
  assessorId: string | null;

  @BelongsTo(() => User, { foreignKey: 'assessorId' })
  assessor: User | null;

  @Column(STRING)
  landmark: string;

  @ZodColumn(INTEGER, zLandmarkScore)
  score: LandmarkScore;

  @Column(STRING)
  markdown: string | null;
}

export default LandmarkAssessment;
