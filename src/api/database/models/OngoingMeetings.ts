import {
  AllowNull,
  Column,
  Table,
  Model,
  Unique,
  PrimaryKey
} from "sequelize-typescript";
import { STRING } from "sequelize";

/*
* This table maps TencentMeeting User(admin/host) ids with the infos of ongoing meeting associated with the user id. 
*/

@Table({
  indexes: [{
    fields: ['groupId']
  }]
})
class OngoingMeetings extends Model {
  @PrimaryKey
  @AllowNull(false)
  @Unique
  @Column(STRING)
  tmUserId: string;

  @AllowNull(false)
  @Unique
  @Column(STRING)
  groupId: string;

  @AllowNull(false)
  @Unique
  @Column(STRING)
  meetingId: string;

  @AllowNull(false)
  @Unique
  @Column(STRING)
  meetingLink: string;
}

export default OngoingMeetings;
