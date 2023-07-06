import {
  Column,
  ForeignKey,
  Table,
  BelongsTo,
  Model,
  PrimaryKey
} from "sequelize-typescript";
import { INTEGER, STRING } from "sequelize";

/*
* This table maps TencentMeeting admin user ids with the number of ongoing meetings associated with the TM admin user ids. 
* Normally we expect either 0 or 1 because only one meeting is allowed per admin user
* It is possible that the count is up to 2 meetings if two groups started the meeting simultaneously 
*/
@Table
class OngoingMeetingCount extends Model {
  @PrimaryKey
  @Column(STRING)
  TMAdminUserId: string;

  @Column(STRING)
  meetingId: string;

  @Column(INTEGER)
  count: number;
}

export default OngoingMeetingCount;
