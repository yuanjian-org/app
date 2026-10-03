import {
  Column,
  Table,
  Model,
  ForeignKey,
  AllowNull,
  DataType,
} from "sequelize-typescript";
import User from "./User";
import ChatRoom from "./ChatRoom";
import ChatMessage from "./ChatMessage";
import ShudongPost from "./ShudongPost";

@Table({
  indexes: [
    {
      fields: ["chatRoomId", "authorId"],
      unique: true,
    },
    {
      fields: ["chatMessageId", "authorId"],
      unique: true,
    },
    {
      fields: ["shudongParentId", "authorId"],
      unique: true,
    },
    {
      fields: ["shudongPostId", "authorId"],
      unique: true,
    },
  ],
})
class DraftMessage extends Model {
  /**
   * chatRoomId and chatMessageId are mutually exclusive, meaning that one and only one
   * of them is null. When chatRoomId is non-null, it's a draft of a new message.
   * When chatMessageId is non-null, it's a draft of an existing message.
   * Similarly, shudongParentId and shudongPostId are for Shudong post creation / editing drafts.
   */
  @ForeignKey(() => ChatRoom)
  @Column(DataType.UUID)
  chatRoomId: string | null;

  @ForeignKey(() => ChatMessage)
  @Column(DataType.UUID)
  chatMessageId: string | null;

  @Column(DataType.STRING(255))
  shudongParentId: string | null;

  @ForeignKey(() => ShudongPost)
  @Column(DataType.UUID)
  shudongPostId: string | null;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  authorId: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  markdown: string;
}

export default DraftMessage;
