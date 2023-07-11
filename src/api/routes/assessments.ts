import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import _ from "lodash";
import db from "api/database/db";
import { z } from "zod";
import { zAssessment } from "shared/Assessment";
import Partnership from "api/database/models/Partnership";
import { includePartnershipUsers } from "./partnerships";
import { TRPCError } from "@trpc/server";

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

const get = procedure
  .use(authUser('PartnershipAssessor'))
  .input(z.object({
    id: z.string().uuid(),
  }))
  .output(zAssessment)
  .query(async ({ input }) => 
{
  const res = await db.Assessment.findByPk(input.id, {
    include: [{
      model: Partnership,
      include: includePartnershipUsers,
    }],
  });
  if (!res) throw new TRPCError({
    code: "NOT_FOUND",
    message: `跟踪评估 ${input.id} not found`,
  });
  return res;
});

const routes = router({
  create,
  get,
});

export default routes;
