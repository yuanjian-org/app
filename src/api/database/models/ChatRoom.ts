import {
  Column,
  Table,
  Model,
  PrimaryKey,
  IsUUID,
  Default,
  HasMany,
  ForeignKey,
  HasOne,
  Unique,
  BelongsTo,
} from "sequelize-typescript";
import { CreationOptional, UUID, UUIDV4 } from "sequelize";
import ChatMessage from "./ChatMessage";
import Partnership from "./Partnership";

@Table
class ChatRoom extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  // A chat room is "owned" by a mentorship if this field is non-null.
  @Unique
  @ForeignKey(() => Partnership)
  @Column(UUID)
  mentorshipId: string | null;

  /**
   * Associations
   */

  @HasMany(() => ChatMessage)
  messages: ChatMessage[];

  @BelongsTo(() => Partnership)
  mentorship: Partnership | null;
}

export default ChatRoom;
