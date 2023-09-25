import {
  Column,
  Table,
  Model,
  PrimaryKey,
  IsUUID,
  Default,
  ForeignKey,
  AllowNull,
} from "sequelize-typescript";
import { CreationOptional, UUID, UUIDV4 } from "sequelize";
import User from "./User";
import ChatThread from "./ChatThread";

@Table
class ChatMessage extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  @ForeignKey(() => ChatThread)
  @AllowNull(false)
  @Column(UUID)
  threadId: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  userId: string;
}

export default ChatMessage;
