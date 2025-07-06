import {
  Column,
  ForeignKey,
  Table,
  BelongsTo,
  Model,
  PrimaryKey,
  HasMany,
  BeforeDestroy,
  Unique,
} from "sequelize-typescript";
import { DATE, STRING, UUID } from "sequelize";
import Group from "./Group";
import Summary from "./Summary";
import { DateColumn } from "shared/DateColumn";

@Table
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
  startedAt: DateColumn;

  @Column(DATE)
  endedAt: DateColumn;

  @HasMany(() => Summary)
  summaries: Summary[];

  @BeforeDestroy
  static async cascadeDestroy(tr: Transcript, options: any) {
    const promises = (
      await Summary.findAll({
        where: { transcriptId: tr.transcriptId },
      })
    ).map(async (s) => {
      await s.destroy(options);
    });

    await Promise.all(promises);
  }
}

export default Transcript;
