import { Column, Table, Model, AllowNull, Unique } from "sequelize-typescript";
import { STRING } from "sequelize";

@Table
export default class PhoneAndEmailToken extends Model {
  // Client IP address for rate limiting.
  @AllowNull(false)
  @Column(STRING)
  ip: string;

  // Separate phones and emails to have their rate limits not interfere with
  // each other.
  @Unique
  @Column(STRING)
  phone: string | null;

  @Unique
  @Column(STRING)
  email: string | null;

  @AllowNull(false)
  @Column(STRING)
  token: string;
}
