import { Table, Model, AllowNull } from "sequelize-typescript";
import { TEXT, UUID } from "sequelize";
import ZodColumn from "../modelHelpers/ZodColumn";
import {
  zScheduledEmailType,
  ScheduledEmailType,
} from "../../../shared/ScheduledEmailType";
import { z } from "zod";

@Table({
  indexes: [
    {
      fields: ["type", "subjectId"],
      unique: true,
    },
  ],
})
export default class ScheduledEmail extends Model {
  @AllowNull(false)
  @ZodColumn(TEXT, zScheduledEmailType)
  type: ScheduledEmailType;

  @AllowNull(false)
  @ZodColumn(UUID, z.string().uuid())
  subjectId: string;
}
