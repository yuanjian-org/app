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

@Table
export default class PhoneVerificationToken extends Model {
  @PrimaryKey
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  userId: string;

  @AllowNull(false)
  @Column(STRING)
  phone: string;

  @AllowNull(false)
  @Column(STRING)
  token: string;
}
