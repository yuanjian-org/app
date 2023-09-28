import {
  Table,
  Column,
  Model,
  ForeignKey,
  BelongsTo,
  PrimaryKey,
  AllowNull,
} from 'sequelize-typescript';
import { UUID, STRING } from 'sequelize';
import User from './User';
import Transcript from "./Transcript";

/*
* This table maps user names with handlebars(Tencent Meeting User Name) in transcripts/summaries
*/
@Table
class TranscriptNameMapping extends Model {
  @PrimaryKey
  @Column(STRING)
  handlebarName: string;

  @PrimaryKey
  @ForeignKey(() => Transcript)
  @Column(STRING)
  transcriptId: string;

  @Column(UUID)
  @ForeignKey(() => User)
  @AllowNull(false)
  userId: string;

  /**
   * Associations
   */
  @BelongsTo(() => User)
  user: User;
}

export default TranscriptNameMapping;
