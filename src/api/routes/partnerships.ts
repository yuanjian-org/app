import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import _ from "lodash";
import db from "api/database/db";
import { 
  includePartnershipUsers, 
  zPartnership, 
  zPartnershipCountingAssessments, 
  zPartnershipWithAssessments } from "../../shared/Partnership";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Assessment from "../database/models/Assessment";
import { alreadyExistsError, generalBadRequestError, noPermissionError, notFoundError } from "api/errors";
import sequelizeInstance from "api/database/sequelizeInstance";
import { isPermitted } from "shared/Role";

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

const listMineAsMentor = procedure
  .use(authUser())
  .output(z.array(zPartnership))
  .query(async ({ ctx }) => 
{
  return await db.Partnership.findAll({
    where: { mentorId: ctx.user.id },
    include: includePartnershipUsers,
  });
});

// TODO: remove this function. Use partnership.get + assessments.listAllOfPartnership instead.
const getWithAssessments = procedure
  .use(authUser())
  .input(z.string())
  .output(zPartnershipWithAssessments)
  .query(async ({ ctx, input: id }) => 
{
  const res = await db.Partnership.findByPk(id, {
    include: [
      ...includePartnershipUsers,
      Assessment,
    ]
  });
  if (!res) throw notFoundError("一对一匹配", id);

  // Only assessors and mentors can access the partnership.
  if (!isPermitted(ctx.user.roles, 'PartnershipAssessor') && res.mentorId !== ctx.user.id) {
    throw noPermissionError("一对一匹配", id);
  }

  return res;
});

const routes = router({
  create,
  listAll,
  listMineAsMentor,
  getWithAssessments,
});

export default routes;
