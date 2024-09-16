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
import z from "zod";
import { MAX_LANDMARK_SCORE } from "shared/Map";

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

  @ZodColumn(INTEGER, z.number().int().min(1).max(MAX_LANDMARK_SCORE))
  score: number;

  @Column(STRING)
  markdown: string | null;
}

export default LandmarkScore;
