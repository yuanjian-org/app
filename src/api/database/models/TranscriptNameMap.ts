import {
  Table,
  Column,
  Model,
  ForeignKey,
  BelongsTo,
  PrimaryKey,
} from 'sequelize-typescript';
import { UUID, STRING } from 'sequelize';
import User from './User';

/*
* This table maps user names with handlebars(Tencent Meeting User Name) in transcripts/summaries
*/
@Table
class TranscriptNameMap extends Model {
  @PrimaryKey
  @Column(STRING)
  handlebarName: string;

  @Column(UUID)
  @ForeignKey(() => User)
  userId: string;

  /**
   * Associations
   */
  @BelongsTo(() => User)
  user: User;
}

export default TranscriptNameMap;
