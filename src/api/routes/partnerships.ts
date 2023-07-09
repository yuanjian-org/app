import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import _ from "lodash";
import db from "api/database/db";
import { isValidPartnershipIds, zPartnership } from "shared/Partnership";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { minUserProfileAttributes } from "shared/UserProfile";

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
  .output(z.array(zPartnership))
  .query(async () => 
{
  const res = await db.Partnership.findAll({
    include: [{
      association: 'mentor',
      attributes: minUserProfileAttributes,
    }, {
      association: 'mentee',
      attributes: minUserProfileAttributes,
    }]
  });
  return res;
});

const routes = router({
  create,
  list,
});

export default routes;
