import {
  Column,
  Table,
  Model,
  ForeignKey,
  AllowNull,
} from "sequelize-typescript";
import { STRING, UUID } from "sequelize";
import User from "./User";
import ChatRoom from "./ChatRoom";
import ChatMessage from "./ChatMessage";

@Table({
  indexes: [
    {
      fields: ["roomId", "authorId"],
      unique: true,
    },
    {
      fields: ["messageId", "authorId"],
      unique: true,
    },
  ],
})
class DraftChatMessage extends Model {
  /**
   * roomId and messageId are mutually exclusive, meaning that one and only one
   * of them is null. When roomId is non-null, it's a draft of a new message.
   * When messageId is non-null, it's a draft of an existing message.
   */

  @ForeignKey(() => ChatRoom)
  @Column(UUID)
  roomId: string | null;

  @ForeignKey(() => ChatMessage)
  @Column(UUID)
  messageId: string | null;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  authorId: string;

  @AllowNull(false)
  @Column(STRING(1 * 1024 * 1024))
  markdown: string;
}

export default DraftChatMessage;
