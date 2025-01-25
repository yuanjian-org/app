import {
  AllowNull,
  Column,
  Table,
  Model, ForeignKey
} from "sequelize-typescript";
import { DATE, STRING, UUID } from "sequelize";
import Group from "./Group";
import { DateColumn } from "shared/DateColumn";

@Table
class MeetingHistory extends Model {
  @AllowNull(false)
  @Column(STRING)
  meetingId: string;

  // TODO: Why didn't migration script add the foreign key constraint to SQL?
  @AllowNull(false)
  @Column(UUID)
  @ForeignKey(() => Group)
  groupId: string;

  /**
   * The upper bound of meeting end time. We don't know the exact end time
   * because we only pull meeting status periodically. See refreshMeetingSlots()
   * 
   * Meeting start time is encoded as the `createdAt` column.
   */
  @Column(DATE)
  endedBefore: DateColumn | null;
}

export default MeetingHistory;
