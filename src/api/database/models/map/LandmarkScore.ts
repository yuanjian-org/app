import {
  Column,
  Table,
  Model,
  PrimaryKey,
  ForeignKey,
} from "sequelize-typescript";
import { UUID, STRING, INTEGER } from "sequelize";
import User from "../User";
import ZodColumn from "../../modelHelpers/ZodColumn";
import { zLandmarkScore, LandmarkScore as Score } from "../../../../shared/Map";

@Table({
  indexes: [
    {
      unique: true,
      // Composite key on userId, landmark, createdAt
      fields: ['userId', 'landmark', 'createdAt'],
    },
  ],
})
class LandmarkScore extends Model {
  @PrimaryKey
  @ForeignKey(() => User)
  @Column(UUID)
  userId: string;

  @PrimaryKey
  @Column(STRING)
  landmark: string;

  @ZodColumn(INTEGER, zLandmarkScore)
  score: Score;

  @Column(STRING)
  markdown: string | null;
}

export default LandmarkScore;
