import {
  Column,
  Table,
  Model,
  PrimaryKey,
  IsUUID,
  Default,
  HasMany,
} from "sequelize-typescript";
import { CreationOptional, UUID, UUIDV4 } from "sequelize";
import ChatMessage from "./ChatMessage";

@Table
class ChatThread extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  /**
   * Associations
   */

  @HasMany(() => ChatMessage)
  messages: ChatMessage[];
}

export default ChatThread;
