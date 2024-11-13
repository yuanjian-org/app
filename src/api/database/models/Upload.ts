import {
  Column,
  Model,
  AllowNull,
  Table,
} from "sequelize-typescript";
import { ARRAY, STRING } from "sequelize";
import ZodColumn from "../modelHelpers/ZodColumn";
import z from "zod";

@Table
export default class Upload extends Model {
  @AllowNull(false)
  @Column(STRING)
  uploader: string;

  @AllowNull(false)
  @ZodColumn(ARRAY(STRING), z.array(z.string()))
  urls: string[];
}
