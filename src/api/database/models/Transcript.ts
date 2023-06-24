import {
  Column,
  ForeignKey,
  Table,
  BelongsTo,
  Model,
  PrimaryKey,
  HasMany
} from "sequelize-typescript";
import { DATE, STRING, UUID } from "sequelize";
import Group from "./Group";
import Summary from "./Summary";

@Table({ paranoid: true })
class Transcript extends Model {
  @PrimaryKey
  @Column({
    type: STRING,
    unique: true,
  })
  // TODO: rename to simply 'id'?
  transcriptId: string;

  @Column(UUID)
  @ForeignKey(() => Group)
  groupId: string;

  @BelongsTo(() => Group)
  group: Group;

  @Column(DATE)
  startedAt: Date;

  @Column(DATE)
  endedAt: Date;

  @HasMany(() => Summary)
  summaries: Summary[];
}

export default Transcript;
