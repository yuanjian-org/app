import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import db from "../database/db";
import { z } from "zod";
import { zAssessment } from "../../shared/Assessment";
import { noPermissionError, notFoundError } from "../errors";
import { assessmentAttributes } from "api/database/models/attributesAndIncludes";
import { Transaction } from "sequelize";
import sequelize from "../database/sequelize";
import Assessment from "shared/Assessment";

export async function createAssessmentImpl(
  mentorshipId: string,
  transaction?: Transaction,
): Promise<string> {
  const assessment = await db.Assessment.create(
    {
      partnershipId: mentorshipId,
    },
    { transaction },
  );
  return assessment.id;
}

export async function updateAssessmentImpl(
  id: string,
  summary: string,
  transaction?: Transaction,
): Promise<void> {
  const a = await db.Assessment.findByPk(id, { transaction });
  if (!a) throw notFoundError("评估", id);
  await a.update(
    {
      summary,
    },
    { transaction },
  );
}

export async function getAssessmentImpl(
  id: string,
  transaction?: Transaction,
): Promise<Assessment> {
  const a = await db.Assessment.findByPk(id, {
    attributes: assessmentAttributes,
    transaction,
  });
  if (!a) throw notFoundError("评估", id);
  return a as Assessment;
}

export async function listAllForMentorshipImpl(
  mentorshipId: string,
  meId: string,
  transaction?: Transaction,
): Promise<Assessment[]> {
  const p = await db.Mentorship.findByPk(mentorshipId, {
    attributes: ["mentorId"],
    transaction,
  });
  if (p?.mentorId !== meId) {
    throw noPermissionError("一对一匹配", mentorshipId);
  }

  return (await db.Assessment.findAll({
    where: { partnershipId: mentorshipId },
    attributes: assessmentAttributes,
    transaction,
  })) as Assessment[];
}

/**
 * @returns the ID of the created assessment.
 */
const create = procedure
  .use(authUser("MentorshipAssessor"))
  .input(
    z.object({
      mentorshipId: z.string().uuid(),
    }),
  )
  .output(z.string())
  .mutation(async ({ input }) => {
    return await sequelize.transaction(async (t) => {
      return await createAssessmentImpl(input.mentorshipId, t);
    });
  });

const update = procedure
  .use(authUser("MentorshipAssessor"))
  .input(
    z.object({
      id: z.string().uuid(),
      summary: z.string(),
    }),
  )
  .mutation(async ({ input }) => {
    await sequelize.transaction(async (t) => {
      await updateAssessmentImpl(input.id, input.summary, t);
    });
  });

const get = procedure
  .use(authUser("MentorshipAssessor"))
  .input(z.string())
  .output(zAssessment)
  .query(async ({ input: id }) => {
    return await getAssessmentImpl(id);
  });

/**
 * Only the mentor of the specified mentorship are allowed to access this API.
 */
const listAllForMentorship = procedure
  .use(authUser())
  .input(
    z.object({
      mentorshipId: z.string(),
    }),
  )
  .output(z.array(zAssessment))
  .query(async ({ ctx: { me }, input: { mentorshipId } }) => {
    return await listAllForMentorshipImpl(mentorshipId, me.id);
  });

export default router({
  create,
  get,
  update,
  listAllForMentorship,
});
