import {
  Column,
  Table,
  Model,
  PrimaryKey,
  IsUUID,
  Default,
  HasMany,
  ForeignKey,
  Unique,
  BelongsTo,
} from "sequelize-typescript";
import { CreationOptional, UUID, UUIDV4 } from "sequelize";
import ChatMessage from "./ChatMessage";
import User from "./User";

@Table
class ChatRoom extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  // A chat room is "owned" by a mentee user if this field is non-null.
  @Unique
  @ForeignKey(() => User)
  @Column(UUID)
  menteeId: string | null;

  /**
   * Associations
   */

  @HasMany(() => ChatMessage)
  messages: ChatMessage[];

  @BelongsTo(() => User)
  mentee: User | null;
}

export default ChatRoom;
