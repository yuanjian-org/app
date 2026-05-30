import { AllowNull, Column, Table, Model, Unique } from "sequelize-typescript";
import { STRING, UUID } from "sequelize";

@Table
class MeetingSlot extends Model {
  @AllowNull(false)
  @Unique
  @Column(STRING)
  tmUserId: string;

  @AllowNull(false)
  @Unique
  @Column(STRING)
  meetingId: string;

  @AllowNull(false)
  @Unique
  @Column(STRING)
  meetingLink: string;

  // Null when the meeting slot is available to use. Otherwise it's in use by
  // the specified group.
  // TODO: Why didn't migration code add the foreign key constraint to SQL?
  @Unique
  @Column(UUID)
  groupId: string | null;

  @Column(STRING)
  whiteLabel: string | null;
}

export default MeetingSlot;
