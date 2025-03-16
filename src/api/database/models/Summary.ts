import {
  Column,
  ForeignKey,
  Table,
  BelongsTo,
  Model,
  PrimaryKey
} from "sequelize-typescript";
import { STRING, TEXT } from "sequelize";
import Transcript from "./Transcript";

@Table({
  indexes: [{
    unique: true,
    fields: ['transcriptId', 'key']
  }]
})
class Summary extends Model {
  @PrimaryKey
  @ForeignKey(() => Transcript)
  @Column(STRING)
  transcriptId: string;

  @PrimaryKey
  @Column(STRING)
  key: string;

  @Column(TEXT)
  markdown: string;

  /**
   * Associations
   */

  @BelongsTo(() => Transcript)
  transcript: Transcript;
}

export default Summary;
