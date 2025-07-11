import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import sequelize from "../database/sequelize";
import db from "../database/db";
import { Op } from "sequelize";
import {
  kudosAttributes,
  kudosInclude,
} from "../database/models/attributesAndIncludes";
import { zKudos } from "../../shared/Kudos";
import { zDateColumn } from "../../shared/DateColumn";
import moment from "moment";
import { scheduleEmail } from "./scheduledEmails";
import createKudos from "./kudosInternal";

/**
 * List kudos for a user. If userId is not provided, list all kudos.
 * The return value is sorted by createdAt in descending order.
 */
const list = procedure
  .use(authUser("Volunteer"))
  .input(
    z.object({
      userId: z.string().optional(),
      limit: z.number().optional(),
    }),
  )
  .output(z.array(zKudos))
  .query(async ({ input: { userId, limit } }) => {
    return await db.Kudos.findAll({
      where: userId ? { receiverId: userId } : undefined,
      attributes: kudosAttributes,
      include: kudosInclude,
      order: [["createdAt", "DESC"]],
      ...(limit ? { limit } : {}),
    });
  });

/**
 * @return excludes kudos given by the current user.
 */
const getLastKudosCreatedAt = procedure
  .use(authUser("Volunteer"))
  .output(zDateColumn)
  .query(async ({ ctx: { user: me } }) => {
    const ret = await db.Kudos.max("createdAt", {
      where: { giverId: { [Op.ne]: me.id } },
    });
    return ret ?? moment(0);
  });

/**
 * Kudos with null text is a like.
 */
const create = procedure
  .use(authUser("Volunteer"))
  .input(
    z.object({
      userId: z.string(),
      text: z.string().nullable(),
    }),
  )
  .mutation(async ({ ctx: { user: me }, input: { userId, text } }) => {
    await sequelize.transaction(async (t) => {
      await createKudos(me.id, userId, text, t);
      await scheduleEmail("Kudos", userId, t);
    });
  });

export default router({
  create,
  list,
  getLastKudosCreatedAt,
});
