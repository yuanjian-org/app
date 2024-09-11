import {
  Column,
  Table,
  Model,
  PrimaryKey,
  ForeignKey,
  Unique,
  BelongsTo,
} from "sequelize-typescript";
import { UUID, STRING, JSONB, DATE } from "sequelize";
import User from "../User";
import ZodColumn from "../../modelHelpers/ZodColumn";
import z from "zod";

@Table
class Landmark extends Model {
  @PrimaryKey
  @Column(STRING)
  landmark: string;

  @Unique
  @PrimaryKey
  @ForeignKey(() => User)
  @Column(UUID)
  userId: string;

  @ZodColumn(JSONB, z.record(z.string(), z.any()).nullable())
  evalutaion: Record<string, any> | null;

  @Column(DATE)
  history: string;

  @BelongsTo(() => User)
  user: User;
}

export default Landmark;
