import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import {
  zMentorSelection,
  zMentorSelectionBatch,
} from "shared/MentorSelection";
import {
  mentorSelectionAttributes,
  mentorSelectionBatchAttributes,
  mentorSelectionBatchInclude,
  mentorSelectionInclude,
} from "api/database/models/attributesAndIncludes";
import invariant from "tiny-invariant";
import sequelize from "api/database/sequelize";
import { generalBadRequestError, notFoundError } from "api/errors";
import moment from "moment";
import { Op, Transaction, literal } from "sequelize";
import { zDateColumn } from "shared/DateColumn";

const createDraft = procedure
  .use(authUser())
  .input(
    z.object({
      mentorId: z.string(),
      reason: z.string(),
    }),
  )
  .mutation(async ({ ctx: { me }, input: { mentorId, reason } }) => {
    await sequelize.transaction(async (transaction) => {
      let batch = await db.MentorSelectionBatch.findOne({
        where: {
          userId: me.id,
          finalizedAt: null,
        },
        attributes: ["id"],
        include: [
          {
            association: "selections",
            attributes: ["order"],
          },
        ],
        transaction,
      });

      let order: number;
      if (batch) {
        order =
          batch.selections.reduce((max, s) => Math.max(max, s.order), 0) + 1;
      } else {
        batch = await db.MentorSelectionBatch.create(
          {
            userId: me.id,
          },
          { transaction },
        );
        order = 0;
      }

      await db.MentorSelection.create(
        {
          batchId: batch.id,
          mentorId,
          reason,
          order,
        },
        { transaction },
      );
    });
  });

const destroyDraft = procedure
  .use(authUser())
  .input(
    z.object({
      mentorId: z.string(),
    }),
  )
  .mutation(async ({ ctx: { me }, input: { mentorId } }) => {
    await sequelize.transaction(async (transaction) => {
      const batch = await db.MentorSelectionBatch.findOne({
        where: {
          userId: me.id,
          finalizedAt: null,
        },
        attributes: ["id"],
        include: [
          {
            association: "selections",
            attributes: ["id"],
            where: { mentorId },
          },
        ],
        transaction,
      });

      if (!batch || batch.selections.length === 0) {
        throw notFoundError("导师选择", mentorId);
      }

      invariant(batch.selections.length === 1);
      await db.MentorSelection.destroy({
        where: {
          id: batch.selections[0].id,
        },
        transaction,
      });
    });
  });

const updateDraft = procedure
  .use(authUser())
  .input(
    z.object({
      mentorId: z.string(),
      reason: z.string(),
    }),
  )
  .mutation(async ({ ctx: { me }, input: { mentorId, reason } }) => {
    await sequelize.transaction(async (transaction) => {
      const batch = await getDraftBatch(me.id, mentorId, transaction);
      invariant(batch && batch.selections.length === 1);
      if (!batch) {
        throw notFoundError("导师选择", mentorId);
      }
      await batch.selections[0].update({ reason }, { transaction });
    });
  });

// Return null if the user hasn't selected this mentor.
const getDraft = procedure
  .use(authUser())
  .input(
    z.object({
      mentorId: z.string(),
    }),
  )
  .output(zMentorSelection.nullable())
  .query(async ({ ctx: { me }, input: { mentorId } }) => {
    return await sequelize.transaction(async (transaction) => {
      const batch = await getDraftBatch(me.id, mentorId, transaction);
      invariant(!batch || batch.selections.length === 1);
      return batch ? batch.selections[0] : null;
    });
  });

const listDrafts = procedure
  .use(authUser())
  .output(z.array(zMentorSelection))
  .query(async ({ ctx: { me } }) => {
    return await sequelize.transaction(async (transaction) => {
      const batch = await getDraftBatch(me.id, undefined, transaction);
      return batch?.selections ?? [];
    });
  });

/**
 * @param mentorId if undefined, return all drafts. Otherwise, return the draft
 * of the specified mentor.
 */
async function getDraftBatch(
  myId: string,
  mentorId: string | undefined,
  transaction: Transaction,
) {
  return await db.MentorSelectionBatch.findOne({
    where: {
      userId: myId,
      finalizedAt: null,
    },
    include: [
      {
        association: "selections",
        ...(mentorId && { where: { mentorId } }),
        attributes: mentorSelectionAttributes,
        include: mentorSelectionInclude,
      },
    ],
    transaction,
  });
}

const reorderDraft = procedure
  .use(authUser())
  .input(
    z.array(
      z.object({
        mentorId: z.string(),
        order: z.number(),
      }),
    ),
  )
  .mutation(async ({ ctx: { me }, input }) => {
    await sequelize.transaction(async (transaction) => {
      const batch = await getDraftBatch(me.id, undefined, transaction);
      if (!batch || batch.selections.length !== input.length) {
        throw generalBadRequestError("导师选择数量不匹配，请刷新页面重试");
      }

      // To avoid unique key constraint violation, update all orders first.
      let max = batch.selections.reduce((max, s) => Math.max(max, s.order), 0);
      for (const selection of batch.selections) {
        max++;
        await selection.update({ order: max }, { transaction });
      }

      for (const { mentorId, order } of input) {
        const [cnt] = await db.MentorSelection.update(
          { order },
          {
            where: {
              batchId: batch.id,
              mentorId,
            },
            transaction,
          },
        );
        invariant(cnt <= 1);
        if (cnt === 0) {
          throw generalBadRequestError("导师选择不存在，请刷新页面重试");
        }
      }
    });
  });

const finalizeDraft = procedure
  .use(authUser())
  .mutation(async ({ ctx: { me } }) => {
    const [cnt] = await db.MentorSelectionBatch.update(
      {
        finalizedAt: moment(),
      },
      { where: { userId: me.id, finalizedAt: null } },
    );
    invariant(cnt <= 1);
    if (cnt === 0) {
      throw generalBadRequestError("没有未完成的导师选择，请刷新页面重试");
    }
  });

const listFinalizedBatches = procedure
  .use(authUser())
  .output(z.array(zMentorSelectionBatch))
  .query(async ({ ctx: { me } }) => {
    return await db.MentorSelectionBatch.findAll({
      where: {
        userId: me.id,
        finalizedAt: { [Op.ne]: null },
      },
      attributes: mentorSelectionBatchAttributes,
      include: mentorSelectionBatchInclude,
    });
  });

/**
 * @return the latest batch finalizedAt of all users. If a user has a draft
 * (i.e. unfinalized) batch, the returned value is null.
 */
const listLastBatchFinalizedAt = procedure
  .use(authUser("MentorshipManager"))
  .output(
    z.array(
      z.object({
        userId: z.string(),
        finalizedAt: zDateColumn.nullable(),
      }),
    ),
  )
  .query(async () => {
    return await db.MentorSelectionBatch.findAll({
      attributes: [
        "userId",
        [
          literal(`
          CASE
            WHEN COUNT(*) FILTER (WHERE "finalizedAt" IS NULL) > 0 THEN NULL
            ELSE MAX("finalizedAt")
          END
        `),
          "finalizedAt",
        ],
      ],
      group: ["userId"],
      // Return the raw result, without wrapping it in Sequelize instances.
      raw: true,
    });
  });

export default router({
  createDraft,
  destroyDraft,
  getDraft,
  updateDraft,
  listDrafts,
  listLastBatchFinalizedAt,
  listFinalizedBatches,
  reorderDraft,
  finalizeDraft,
});
