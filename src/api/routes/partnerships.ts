import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import _ from "lodash";
import db from "api/database/db";
import { isValidPartnershipIds, zPartnership, zPartnershipCountingAssessments, zPartnershipWithAssessments } from "shared/Partnership";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { minUserProfileAttributes } from "../../shared/UserProfile";
import Assessment from "../database/models/Assessment";

const create = procedure
  .use(authUser('PartnershipManager'))
  .input(z.object({
    mentorId: z.string().uuid(),
    menteeId: z.string().uuid(),
  }))
  .mutation(async ({ input }) => 
{
  if (!isValidPartnershipIds(input.mentorId, input.menteeId)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: '无效用户ID',
    });
  }

  await db.Partnership.create({
    mentorId: input.mentorId,
    menteeId: input.menteeId,
  });
});

const list = procedure
  .use(authUser('PartnershipManager'))
  .output(z.array(zPartnershipCountingAssessments))
  .query(async () => 
{
  const res = await db.Partnership.findAll({
    include: [
      ...includePartnershipUsers,
      {
        model: Assessment,
        attributes: ['id'],
      }
    ]
  });
  return res;
});

const getWithAssessments = procedure
  .use(authUser('PartnershipAssessor'))
  .input(z.object({ id: z.string().uuid() }))
  .output(zPartnershipWithAssessments)
  .query(async ({ input }) => 
{
  const res = await db.Partnership.findByPk(input.id, {
    include: [
      ...includePartnershipUsers,
      Assessment,
    ]
  });
  if (!res) throw new TRPCError({
    code: "NOT_FOUND",
    message: `一对一导师匹配 ${input.id} 不存在`,
  })
  return res;
});

const routes = router({
  create,
  list,
  getWithAssessments,
});

export default routes;

export const includePartnershipUsers = [{
  association: 'mentor',
  attributes: minUserProfileAttributes,
}, {
  association: 'mentee',
  attributes: minUserProfileAttributes,
}];
