import {
  Column,
  ForeignKey,
  Table,
  BelongsTo,
  Model,
  PrimaryKey
} from "sequelize-typescript";
import { STRING, TEXT, INTEGER } from "sequelize";
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
   * initialLength and deletedLength are used to track the number of characters
   * deleted from the original summary. We only allow a small percentage of
   * characters to be deleted for regulatory reasons. Deleted characters are
   * stored anonymously in the DeletedSummary model.
   */
  @Column(INTEGER)
  initialLength: number;

  @Column(INTEGER)
  deletedLength: number;

  /**
   * Associations
   */

  @BelongsTo(() => Transcript)
  transcript: Transcript;
}

export default Summary;
