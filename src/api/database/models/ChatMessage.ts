import {
  Column,
  Table,
  Model,
  PrimaryKey,
  IsUUID,
  Default,
  ForeignKey,
  AllowNull,
  BelongsTo,
} from "sequelize-typescript";
import { CreationOptional, STRING, UUID, UUIDV4 } from "sequelize";
import User from "./User";
import ChatRoom from "./ChatRoom";

@Table({
  indexes: [
    // Used by getLastMessageCreatedAt
    { fields: ["roomId", "createdAt"] },
    // Used by getLastMessageUpdatedAt
    { fields: ["roomId", "userId", "updatedAt"] },
  ],
})
class ChatMessage extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  @ForeignKey(() => ChatRoom)
  @AllowNull(false)
  @Column(UUID)
  roomId: string;

  // TODO: Rename to authorId
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  userId: string;

  @AllowNull(false)
  @Column(STRING(1 * 1024 * 1024))
  markdown: string;

  /**
   * Associations
   */

  @BelongsTo(() => User)
  user: User;

  @BelongsTo(() => ChatRoom)
  room: ChatRoom;
}

export default ChatMessage;
