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
  import Transcript from "./Transcript";

  @Table({ paranoid: true })
  class NameMapping extends Model {
    @PrimaryKey
    @Column(STRING)
    handlebarName: string;

    @PrimaryKey
    @ForeignKey(() => Transcript)
    @Column(STRING)
    transcriptId: string;
  
    @Column(UUID)
    @ForeignKey(() => User)
    userId: string;

    // Associations
    @BelongsTo(() => User)
    user: User;
  }
  
  export default NameMapping;
  