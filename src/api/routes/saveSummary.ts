import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";
import db from "../database/db";
import { SummaryDescriptor } from "./summaries";

export async function hasSummary(
  transcriptId: string,
  key: string,
  transaction?: Transaction,
) {
  const ret =
    (await db.Summary.count({
      where: { transcriptId, key },
      transaction,
    })) > 0;
  if (ret) {
    console.log(
      `Ignoring existing ${key} summary for transcript` + ` "${transcriptId}"`,
    );
  }
  return ret;
}

export async function saveSummaryIfNotExistImpl(
  transcriptId: string,
  groupId: string,
  startedAt: number,
  endedAt: number,
  key: string,
  markdown: string,
  transaction: Transaction,
) {
  console.log(`Save transcript ${transcriptId} key ${key}`);

  await db.Transcript.upsert(
    {
      id: transcriptId,
      groupId,
      startedAt,
      endedAt,
    },
    { transaction },
  );

  // Do NOT use `upsert` because user may have edited the summary after it is
  // first created. For some reason there can be races when the summary is
  // already created. Hence findOrCreate() instead of create()
  await db.Summary.findOrCreate({
    where: { transcriptId, key },
    defaults: {
      markdown,
      initialLength: markdown.length,
      deletedLength: 0,
    },
    transaction,
  });
}

export async function saveSummaryIfNotExist(
  desc: SummaryDescriptor,
  summary: string,
) {
  await sequelize.transaction(async (transaction: Transaction) => {
    await saveSummaryIfNotExistImpl(
      desc.transcriptId,
      desc.groupId,
      desc.startedAt,
      desc.endedAt,
      desc.key,
      summary,
      transaction,
    );
  });
}
