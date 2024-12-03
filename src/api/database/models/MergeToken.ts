import {
  Column,
  Table,
  Model,
  PrimaryKey,
  IsUUID,
  Default,
  ForeignKey,
  AllowNull,
  Unique,
  BelongsTo,
} from "sequelize-typescript";
import { CreationOptional, DATE, STRING, UUID, UUIDV4 } from "sequelize";
import User from "./User";

@Table
export default class MergeToken extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Unique
  @Column(UUID)
  userId: string;

  @AllowNull(false)
  @Unique
  @Column(STRING)
  token: string;

  @AllowNull(false)
  @Column(DATE)
  expiresAt: Date;

  /**
   * Associations
   */
  @BelongsTo(() => User)
  user: User;
}
