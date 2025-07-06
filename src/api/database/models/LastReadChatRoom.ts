import {
  Column,
  Table,
  Model,
  PrimaryKey,
  ForeignKey,
  AllowNull,
} from "sequelize-typescript";
import { DATE, UUID } from "sequelize";
import User from "./User";
import ChatRoom from "./ChatRoom";
import { DateColumn } from "shared/DateColumn";

@Table
class LastReadChatRoom extends Model {
  @PrimaryKey
  @ForeignKey(() => ChatRoom)
  @AllowNull(false)
  @Column(UUID)
  roomId: string;

  @PrimaryKey
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(UUID)
  userId: string;

  // The latest updatedAt of all the chat messages in the room where the user
  // clicked "Mark as read". (We assume updatedAt is always greater than
  // createdAt for all chat messages.)
  @AllowNull(false)
  @Column(DATE)
  lastReadAt: DateColumn;
}

export default LastReadChatRoom;
