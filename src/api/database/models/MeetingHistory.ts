import {
  AllowNull,
  Column,
  Table,
  Model,
  PrimaryKey,
  ForeignKey
} from "sequelize-typescript";
import { BIGINT, STRING, UUID } from "sequelize";
import Group from "./Group";

@Table
class MeetingHistory extends Model {
  @PrimaryKey
  @AllowNull(false)
  @Column(STRING)
  meetingId: string;

  // timestamp in seconds when the meeting started. Use this format to
  // be consistent with TencentMeeting API.
  @PrimaryKey
  @AllowNull(false)
  @Column(BIGINT)
  startTime: number;

  // TODO: Why didn't migration script add the foreign key constraint to SQL?
  @AllowNull(false)
  @Column(UUID)
  @ForeignKey(() => Group)
  groupId: string;
}

export default MeetingHistory;
