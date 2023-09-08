import {
  Column,
  ForeignKey,
  Table,
  BelongsTo,
  Model,
  PrimaryKey
} from "sequelize-typescript";
import { STRING } from "sequelize";
import Transcript from "./Transcript";

@Table({
  paranoid: true,
  indexes: [{
    unique: true,
    fields: ['transcriptId', 'summaryKey']
  }]
})
class Summary extends Model {
  @PrimaryKey
  @ForeignKey(() => Transcript)
  @Column(STRING)
  transcriptId: string;

  // TODO: rename to `key`
  @PrimaryKey
  @Column(STRING)
  summaryKey: string;

  // TODO: rename to `text`
  @Column(STRING(1 * 1024 * 1024))
  summary: string;

  /**
   * Associations
   */

  @BelongsTo(() => Transcript)
  transcript: Transcript;
}

export default Summary;
