import {
  Column,
  Table,
  Model,
  PrimaryKey
} from "sequelize-typescript";
import { STRING } from "sequelize";

// status see details: https://cloud.tencent.com/document/product/1095/93432
// {'MEETING_STATE_READY' && 'MEETING_STATE_OTHER'} is self-defined state, not originally from Tencent Meeting
type StatusSchema = 'MEETING_STATE_READY'|'MEETING_STATE_STARTED' | 'MEETING_STATE_OTHER';

/*
* This table maps TencentMeeting admin user ids with the number of ongoing meetings associated with the TM admin user ids. 
* Normally we expect either 0 or 1 because only one meeting is allowed per admin user
* It is possible that the count is up to 2 meetings if two groups started the meeting simultaneously
*/

@Table({
  indexes: [{
    unique: true,
    fields: ['groupId', 'tmUserId', 'meetingId']
  }, {
    fields: ['meetingId']
  }]
})
class OngoingMeetings extends Model {
  @PrimaryKey
  @Column(STRING)
  groupId: string;

  @Column(STRING)
  tmUserId: string;

  @Column(STRING)
  meetingId: string;

  @Column(STRING)
  status: StatusSchema;

  @Column(STRING)
  meetingLink: string;
}

export default OngoingMeetings;
