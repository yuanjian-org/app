import {
  Column,
  Table,
  Model,
  PrimaryKey,
  ForeignKey,
  AllowNull,
} from "sequelize-typescript";
import { STRING, UUID } from "sequelize";
import User from "./User";

/**
 * Used for cell phone number verification.
 */
@Table
export default class CellToken extends Model {
  @PrimaryKey
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  userId: string;

  @AllowNull(false)
  @Column(STRING)
  cell: string;

  @AllowNull(false)
  @Column(STRING)
  token: string;
}
