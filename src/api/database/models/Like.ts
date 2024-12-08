import {
  Column,
  Table,
  Model,
  ForeignKey,
  AllowNull,
  BelongsTo,
} from "sequelize-typescript";
import { INTEGER, UUID } from "sequelize";
import User from "./User";

@Table({
  indexes: [{
    unique: true,
    fields: ['userId', 'likerId']
  }]
})
export default class Like extends Model {
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  userId: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  likerId: string;

  @AllowNull(false)
  @Column(INTEGER)
  count: number;

  /**
   * Associations
   */
  @BelongsTo(() => User, { foreignKey: 'likerId' })
  liker: User;
}
