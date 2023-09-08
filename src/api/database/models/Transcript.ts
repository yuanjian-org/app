import {
  Column,
  ForeignKey,
  Table,
  BelongsTo,
  Model,
  PrimaryKey,
  HasMany,
  BeforeDestroy,
  Unique
} from "sequelize-typescript";
import { DATE, STRING, UUID } from "sequelize";
import Group from "./Group";
import Summary from "./Summary";

@Table({ paranoid: true })
class Transcript extends Model {
  @Unique
  @PrimaryKey
  @Column(STRING)
  // TODO: rename to simply 'id'?
  transcriptId: string;

  @Column(UUID)
  @ForeignKey(() => Group)
  groupId: string;

  @BelongsTo(() => Group)
  group: Group;

  @Column(DATE)
  startedAt: string;

  @Column(DATE)
  endedAt: string;

  @HasMany(() => Summary)
  summaries: Summary[];

  @BeforeDestroy
  static async cascadeDestroy(tr: Transcript, options: any) {
    const promises = (await Summary.findAll({
      where: { transcriptId: tr.transcriptId }
    })).map(async s => { await s.destroy(options); });

    Promise.all(promises);
  }
}

export default Transcript;
