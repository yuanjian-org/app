import {
  Column,
  Table,
  Model,
  ForeignKey,
  AllowNull,
} from "sequelize-typescript";
import { JSONB, UUID } from "sequelize";
import User from "./User";
import ZodColumn from "../modelHelpers/ZodColumn";
import { zEventLogData, EventLogData } from "../../../shared/EventLog";

@Table({
  indexes: [{ fields: ["createdAt"] }],
})
export default class EventLog extends Model {
  @ForeignKey(() => User)
  @Column(UUID)
  userId: string | null;

  @AllowNull(false)
  @ZodColumn(JSONB, zEventLogData)
  data: EventLogData;
}
