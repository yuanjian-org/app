import {
  AllowNull,
  Column,
  Model,
  Table,
  PrimaryKey,
  ForeignKey,
} from "sequelize-typescript";
import { STRING, UUID } from "sequelize";
import User from "./User";

/**
 * 珍珠生数据表，用于对珍珠生进行身份验证。数据由新华提供。新数据会覆盖旧数据。
 */
@Table
export default class PearlStudent extends Model {
  @PrimaryKey
  @AllowNull(false)
  @Column(STRING)
  pearlId: string;

  @AllowNull(false)
  @Column(STRING)
  name: string;

  /**
   * Null if the student doesn't have a valid national ID.
   */
  @Column(STRING)
  lowerCaseNationalIdLastFour: string | null;

  /**
   * The user who has been validated as a pearl student.
   */
  @ForeignKey(() => User)
  @Column(UUID)
  userId: string | null;
}
