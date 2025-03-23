import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { AutoTaskId, Task, zTask } from "shared/Task";
import { taskAttributes, taskInclude } from "api/database/models/attributesAndIncludes";
import { noPermissionError, notFoundError } from "api/errors";
import sequelize from "api/database/sequelize";
import { zDateColumn } from "shared/DateColumn";
import moment from "moment";
import { Op, Transaction } from "sequelize";
import { isExamAboutToExpire } from "shared/exams";
import { scheduleEmail } from "./scheduledEmails";
import { whereMentorshipIsOngoing } from "./mentorships";

const list = procedure
  .use(authUser())
  .input(z.object({
    assigneeId: z.string(),
    includeDone: z.boolean(),
  }))
  .output(z.array(zTask))
  .query(async ({ ctx: { user }, input: { assigneeId, includeDone } }) =>
{
  if (assigneeId !== user.id) throw noPermissionError("用户", assigneeId);
  
  return (await db.Task.findAll({
    where: {
      assigneeId,
      ...!includeDone && { done: false },
    },
    attributes: taskAttributes,
    include: taskInclude,
  })).map(n => castTask(n));
});

/**
 * We need this pseudo function because id and updatedAt are defined as an
 * optional field in the model but required by the zod type.
 */
export function castTask(n: any): Task {
  return zTask.parse(n);
}

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
      attributes: ["id", "assigneeId"],
      transaction,
    });
    if (task === null) throw notFoundError("待办事项", id.toString());
    if (task.assigneeId !== user.id) {
      throw noPermissionError("待办事项", task.assigneeId);
    }

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
      assigneeId: me.id,
      creatorId: isAutoTaskOrCreatorIsOther(me.id),
      done: false,
    },
  });
  return ret ?? moment(0);
});

export function isAutoTaskOrCreatorIsOther(assigneeId: string) {
  return { [Op.or]: [{ [Op.eq]: null }, { [Op.ne]: assigneeId }] };
}

export default router({
  list,
  updateDone,
  getLastTasksUpdatedAt,
});

export async function createAutoTasks() {
  await sequelize.transaction(async transaction => {
    // Find all ongoing mentorships
    const mentorships = await db.Mentorship.findAll({
      where: whereMentorshipIsOngoing,
      attributes: [],
      include: [{
        association: "mentor",
        attributes: ["id", "state"],
      }],
      transaction,
    });

    // Create study-comms tasks
    for (const m of mentorships) {
      if (isExamAboutToExpire(m.mentor.state?.commsExam)) {
        await createAutoTask(m.mentor.id, "study-comms", transaction);
      }
    }

    // Create study-handbook tasks
    for (const m of mentorships) {
      if (isExamAboutToExpire(m.mentor.state?.handbookExam)) {
        await createAutoTask(m.mentor.id, "study-handbook", transaction);
      }
    }
  });
}

async function createAutoTask(
  assigneeId: string,
  autoTaskId: AutoTaskId,
  transaction: Transaction,
) {
  const task = await db.Task.findOne({
    where: { assigneeId, autoTaskId },
    attributes: ["id", "done"],
    transaction,
  });

  // Do nothing if the task is already created and pending.
  if (task && !task.done) {
    console.log(`AutoTask ${autoTaskId} for ${assigneeId} is already created`);
    return;
  }

  console.log(`creating AutoTask ${autoTaskId} for user ${assigneeId}`);

  // Sequelize's upsert() doesn't work because it can't deal with the id column.
  if (task) {
    await task.update({ done: false }, { transaction });
  } else {
    await db.Task.create({
      assigneeId,
      autoTaskId,
      done: false,
    }, { transaction });
  }

  await scheduleEmail("Task", assigneeId, transaction);
}
