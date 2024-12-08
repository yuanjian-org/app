import {
  Table,
  Model,
  AllowNull,
  Index,
} from "sequelize-typescript";
import { JSONB } from "sequelize";
import ZodColumn from "../modelHelpers/ZodColumn";
import {
  zScheduledEmailData,
  ScheduledEmailData,
} from "../../../shared/ScheduledEmail";

@Table
export default class ScheduledEmail extends Model {
  @Index({ using: 'gin' })
  @AllowNull(false)
  @ZodColumn(JSONB, zScheduledEmailData)
  data: ScheduledEmailData;
}
