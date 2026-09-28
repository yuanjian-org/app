import {
  Column,
  Table,
  Model,
  ForeignKey,
  AllowNull,
  Default,
  DataType,
} from "sequelize-typescript";
import User from "./User";
import ChatRoom from "./ChatRoom";
import ChatMessage from "./ChatMessage";
import ShudongPost from "./ShudongPost";

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
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
    primaryKey: true,
  })
  id: string;

  @ForeignKey(() => ChatRoom)
  @Column(DataType.UUID)
  roomId: string | null;

  @ForeignKey(() => ChatMessage)
  @Column(DataType.UUID)
  messageId: string | null;

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
