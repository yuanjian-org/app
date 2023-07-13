import {
  AllowNull,
  Column,
  Table,
  Model,
  PrimaryKey
} from "sequelize-typescript";
import { STRING } from "sequelize";

/*
* This table maps TencentMeeting admin user ids with the number of ongoing meetings associated with the TM admin user ids. 
*/

@Table({
  indexes: [{
    unique: true,
    fields: ['groupId', 'meetingId']
  }, {
    fields: ['groupId']
  }]
})
class OngoingMeetings extends Model {
  @PrimaryKey
  @Column(STRING)
  tmUserId: string;

  @AllowNull(false)
  @Column(STRING)
  groupId: string;

  @AllowNull(false)
  @Column(STRING)
  meetingId: string;

  @AllowNull(false)
  @Column(STRING)
  meetingLink: string;
}

export default OngoingMeetings;
