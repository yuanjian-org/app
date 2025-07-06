import {
  Column,
  Table,
  Model,
  ForeignKey,
  AllowNull,
  BelongsTo,
} from "sequelize-typescript";
import { TEXT, UUID } from "sequelize";
import User from "./User";

@Table({
  indexes: [{ fields: ["createdAt"] }],
})
export default class Kudos extends Model {
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  receiverId: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  giverId: string;

  /**
   * When null, the kudos is merely a like (ie. thumbs-up).
   */
  @Column(TEXT)
  text: string | null;

  /**
   * Associations
   */

  @BelongsTo(() => User, { foreignKey: "receiverId" })
  receiver: User;

  @BelongsTo(() => User, { foreignKey: "giverId" })
  giver: User;
}
