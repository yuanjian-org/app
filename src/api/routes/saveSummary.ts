import sequelize from "../database/sequelize";
import { EmptyResultError, Transaction } from "sequelize";
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
  if (await hasSummary(transcriptId, key, transaction)) return;

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
  // first created.
  try {
    await db.Summary.create(
      {
        transcriptId,
        key,
        markdown,
        initialLength: markdown.length,
        deletedLength: 0,
      },
      { transaction, ignoreDuplicates: true },
    );
  } catch (e: any) {
    if (e instanceof EmptyResultError) {
      // Ignored. Another concurrent process has already created the summary.
      console.log(`Summary already exists for transcript ${transcriptId} key ${key}`);
    } else {
      throw e;
    }
  }
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
