import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import _ from "lodash";
import db from "../database/db";
import { z } from "zod";
import { zAssessment } from "../../shared/Assessment";
import { noPermissionError, notFoundError } from "../errors";
import { assessmentAttributes } from "api/database/models/attributesAndIncludes";
import { isPermitted } from "shared/Role";

/**
 * @returns the ID of the created assessment.
 */
const create = procedure
  .use(authUser('PartnershipAssessor'))
  .input(z.object({
    partnershipId: z.string().uuid(),
  }))
  .output(z.string())
  .mutation(async ({ input }) => 
{
  return (await db.Assessment.create({
    partnershipId: input.partnershipId,
  })).id;
});

const update = procedure
  .use(authUser('PartnershipAssessor'))
  .input(z.object({
    id: z.string().uuid(),
    summary: z.string(),
  }))
  .mutation(async ({ input }) => 
{
  const a = await db.Assessment.findByPk(input.id);
  if (!a) throw notFoundError("评估", input.id);
  await a.update({
    summary: input.summary,
  });
});

const get = procedure
  .use(authUser('PartnershipAssessor'))
  .input(z.string())
  .output(zAssessment)
  .query(async ({ input: id }) =>
{
  const a = await db.Assessment.findByPk(id, {
    attributes: assessmentAttributes,
  });
  if (!a) throw notFoundError("评估", id);
  return a;
});

/**
 * Only the mentor of the specified partnership and mentor coaches are allowed to use this API.
 */
const listAllForMentorship = procedure
  .use(authUser())
  .input(z.object({
    mentorshipId: z.string(),
  }))
  .output(z.array(zAssessment))
  .query(async ({ ctx, input: { mentorshipId } }) =>
{
  const p = await db.Partnership.findByPk(mentorshipId, { attributes: ["mentorId"] });
  if (p?.mentorId !== ctx.user.id && !isPermitted(ctx.user.roles, "MentorCoach")) {
    throw noPermissionError("一对一匹配", mentorshipId);
  }

  return await db.Assessment.findAll({
    where: { partnershipId: mentorshipId },
    attributes: assessmentAttributes,
  });
});

export default router({
  create,
  get,
  update,
  listAllForMentorship,
});
