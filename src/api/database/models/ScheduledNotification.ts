import { Table, Model, AllowNull } from "sequelize-typescript";
import { TEXT, UUID } from "sequelize";
import ZodColumn from "../modelHelpers/ZodColumn";
import {
  zScheduledNotificationType,
  ScheduledNotificationType,
} from "../../../shared/ScheduledNotificationType";
import { z } from "zod";

@Table({
  indexes: [
    {
      fields: ["type", "subjectId"],
      unique: true,
    },
  ],
})
export default class ScheduledNotification extends Model {
  @AllowNull(false)
  @ZodColumn(TEXT, zScheduledNotificationType)
  type: ScheduledNotificationType;

  @AllowNull(false)
  @ZodColumn(UUID, z.string().uuid())
  subjectId: string;
}
