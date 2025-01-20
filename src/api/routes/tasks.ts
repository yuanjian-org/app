import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { AutoTaskId, zTask } from "shared/Task";
import { taskAttributes, taskInclude } from "api/database/models/attributesAndIncludes";
import { noPermissionError, notFoundError } from "api/errors";
import sequelize from "api/database/sequelize";
import { zDateColumn } from "shared/DateColumn";
import moment from "moment";
import { Op } from "sequelize";

const list = procedure
  .use(authUser())
  .input(z.object({
    userId: z.string(),
    includeDone: z.boolean(),
  }))
  .output(z.array(zTask))
  .query(async ({ ctx: { user }, input: { userId, includeDone } }) =>
{
  if (userId !== user.id) throw noPermissionError("用户", userId);
  
  return (await db.Task.findAll({
    where: {
      userId,
      ...!includeDone && { done: false },
    },
    attributes: taskAttributes,
    include: taskInclude,
  })).map(n => ({
    // id is defined as an optional field in the model but it's required by
    // the return type. Hence we manually translate it which is a stupid hack.
    id: n.id,
    autoTaskId: n.autoTaskId as AutoTaskId | null,
    markdown: n.markdown,
    done: n.done,
    creator: n.creator,
    updatedAt: n.updatedAt,
  }));
});

const updateDone = procedure
  .use(authUser())
  .input(z.object({
    id: z.number(),
    done: z.boolean(),
  }))
  .mutation(async ({ ctx: { user }, input: { id, done } }) => 
{
  await sequelize.transaction(async transaction => {
    const task = await db.Task.findByPk(id, {
      attributes: ["id", "userId"],
      transaction,
    });
    if (task === null) throw notFoundError("待办事项", id.toString());
    if (task.userId !== user.id) throw noPermissionError("待办事项", task.userId);

    await task.update({ done }, { transaction });
  });
});

/**
 * @return excludes tasks that are done or created by the current user.
 */
const getLastTasksUpdatedAt = procedure
  .use(authUser())
  .output(zDateColumn)
  .query(async ({ ctx: { user: me } }) => 
{
  const ret = await db.Task.max("updatedAt", {
    where: {
      userId: me.id,
      creatorId: { [Op.or]: [{ [Op.eq]: null }, { [Op.ne]: me.id }] },
      done: false,
    },
  });
  return ret ?? moment(0);
});

export default router({
  list,
  updateDone,
  getLastTasksUpdatedAt,
});
