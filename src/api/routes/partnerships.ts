import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import _ from "lodash";
import db from "api/database/db";
import { zPartnershipCountingAssessments, zPartnershipWithAssessments } from "shared/Partnership";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { minUserProfileAttributes } from "../../shared/UserProfile";
import Assessment from "../database/models/Assessment";
import { alreadyExistsError, generalBadRequestError } from "api/errors";
import sequelizeInstance from "api/database/sequelizeInstance";

const create = procedure
  .use(authUser('PartnershipManager'))
  .input(z.object({
    mentorId: z.string().uuid(),
    menteeId: z.string().uuid(),
  }))
  .mutation(async ({ input }) => 
{
  await sequelizeInstance.transaction(async (t) => {
    const mentor = await db.User.findByPk(input.mentorId);
    const mentee = await db.User.findByPk(input.menteeId);
    if (mentor == null || mentee == null || mentor.id === mentee.id) {
      throw generalBadRequestError('无效用户ID');
    }

    // Assign appropriate roles.
    mentor.roles = [...mentor.roles.filter(r => r != "Mentor"), "Mentor"];
    mentor.save({ transaction: t });
    mentee.roles = [...mentee.roles.filter(r => r != "Mentee"), "Mentee"];
    mentee.save({ transaction: t });

    try {
      await db.Partnership.create({
        mentorId: mentor.id,
        menteeId: mentee.id,
      }, { transaction: t });
    } catch (e: any) {
      if ('name' in e && e.name === "SequelizeUniqueConstraintError") {
        throw alreadyExistsError("一对一匹配");
      }
    }
  });
});

const listAll = procedure
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
  listAll,
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
