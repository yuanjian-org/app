import {
  Column,
  Table,
  Model,
  ForeignKey,
  AllowNull,
} from "sequelize-typescript";
import { JSONB, UUID } from "sequelize";
import User from "./User";
import {
  zMatchFeedback,
  MatchFeedback as zMatchFeedbackType,
} from "../../../shared/MatchFeedback";
import ZodColumn from "../modelHelpers/ZodColumn";

@Table
export default class MatchFeedback extends Model {
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  userId: string;

  @AllowNull(false)
  @ZodColumn(JSONB, zMatchFeedback)
  feedback: zMatchFeedbackType;
}
