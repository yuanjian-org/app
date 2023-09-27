import {
    Table,
    Column,
    Model,
    ForeignKey,
    BelongsTo,
    PrimaryKey,
  } from 'sequelize-typescript';
  import { STRING } from 'sequelize';
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
  
    @ForeignKey(() => User)
    @Column(STRING)
    userId: string;
  
    // Associations
    @BelongsTo(() => User)
    user: User;
  }
  
  export default NameMapping;
  