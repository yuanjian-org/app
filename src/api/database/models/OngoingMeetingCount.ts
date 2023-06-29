import {
  Column,
  ForeignKey,
  Table,
  BelongsTo,
  Model,
  PrimaryKey
} from "sequelize-typescript";
import { INTEGER, STRING } from "sequelize";

@Table
class OngoingMeetingCount extends Model {
  @PrimaryKey
  @Column(STRING)
  TMUserId: string;

  @Column(INTEGER)
  count: number;
}

export default OngoingMeetingCount;
