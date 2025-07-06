import { Table, Model, AllowNull } from "sequelize-typescript";
import { JSONB } from "sequelize";
import ZodColumn from "../modelHelpers/ZodColumn";
import {
  zGlobalConfig,
  GlobalConfig as GlobalConfigType,
} from "../../../shared/GlobalConfig";

/**
 * A singleton table that stores global configurations.
 */
@Table
export default class GlobalConfig extends Model {
  @AllowNull(false)
  @ZodColumn(JSONB, zGlobalConfig)
  data: GlobalConfigType;
}
