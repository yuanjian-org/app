import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { AutoTaskId, isAutoTask, Task, zTask } from "../../shared/Task";
import {
  taskAttributes,
  taskInclude,
} from "../database/models/attributesAndIncludes";
import {
  generalBadRequestError,
  noPermissionError,
  notFoundError,
} from "../errors";
import sequelize from "../database/sequelize";
import { zDateColumn } from "../../shared/DateColumn";
import moment from "moment";
import { Op, Transaction } from "sequelize";
import { isExamAboutToExpire } from "../../shared/exams";
import { scheduleEmail } from "./scheduledEmails";
import { whereMentorshipIsOngoing } from "./mentorships";
import { isPermittedtoAccessMentee } from "./users";
import { isPermitted } from "../../shared/Role";
import { User } from "next-auth";

const list = procedure
  .use(authUser())
  .input(
    z.object({
      assigneeIds: z.array(z.string()),
      includeTasksCreatedByMe: z.boolean(),
      includeDoneTasks: z.boolean(),
    }),
  )
  .output(z.array(zTask))
  .query(
    async ({
      ctx: { me },
      input: { assigneeIds, includeTasksCreatedByMe, includeDoneTasks },
    }) => {
      return await sequelize.transaction(async (transaction) => {
        for (const assigneeId of assigneeIds) {
          if (
            assigneeId !== me.id &&
            // For mentors, only mentorship managers can see their tasks.
            !isPermitted(me.roles, "MentorshipManager") &&
            // For mentees, only mentorship managers and mentors can see their tasks.
            !(await isPermittedtoAccessMentee(me, assigneeId, transaction))
          ) {
            throw noPermissionError("待办事项");
          }
        }

        return (
          await db.Task.findAll({
            where: {
              [Op.or]: [
                ...assigneeIds.map((assigneeId) => ({ assigneeId })),
                ...(includeTasksCreatedByMe ? [{ creatorId: me.id }] : []),
              ],
              ...(!includeDoneTasks && { done: false }),
            },
            attributes: taskAttributes,
            include: taskInclude,
            transaction,
          })
        ).map((n) => castTask(n));
      });
    },
  );

/**
 * We need this pseudo function because id and updatedAt are defined as an
 * optional field in the model but required by the zod type.
 */
export function castTask(n: any): Task {
  return zTask.parse(n);
}

const create = procedure
  .use(authUser())
  .input(
    z.object({
      assigneeId: z.string(),
      markdown: z.string(),
    }),
  )
  .mutation(async ({ ctx: { me }, input: { assigneeId, markdown } }) => {
    if (markdown.trim().length === 0) {
      throw generalBadRequestError("待办事项不能为空。");
    }

    await sequelize.transaction(async (transaction) => {
      await db.Task.create(
        {
          creatorId: me.id,
          assigneeId,
          markdown: markdown.trim(),
          done: false,
        },
        { transaction },
      );

      await scheduleEmail("Task", assigneeId, transaction);
    });
  });

const update = procedure
  .use(authUser())
  .input(
    z.object({
      id: z.number(),
      assigneeId: z.string(),
      markdown: z.string(),
    }),
  )
  .mutation(async ({ ctx: { me }, input: { id, assigneeId, markdown } }) => {
    if (markdown.trim().length === 0) {
      throw generalBadRequestError("待办事项不能为空。");
    }

    await sequelize.transaction(async (transaction) => {
      const task = await db.Task.findByPk(id, {
        attributes: taskAttributes,
        include: taskInclude,
        transaction,
      });
      checkForUpdate(castTask(task), me);

      await db.Task.update(
        {
          assigneeId,
          markdown: markdown.trim(),
        },
        {
          where: { id },
          transaction,
        },
      );

      await scheduleEmail("Task", assigneeId, transaction);
    });
  });

const updateDone = procedure
  .use(authUser())
  .input(
    z.object({
      id: z.number(),
      done: z.boolean(),
    }),
  )
  .mutation(async ({ ctx: { me }, input: { id, done } }) => {
    await sequelize.transaction(async (transaction) => {
      const task = await db.Task.findByPk(id, {
        attributes: taskAttributes,
        include: taskInclude,
        transaction,
      });
      checkForUpdate(castTask(task), me);
      await db.Task.update(
        { done },
        {
          where: { id },
          transaction,
        },
      );
    });
  });

function checkForUpdate(task: Task | null, me: User) {
  if (!task) throw notFoundError("待办事项");

  if (
    isAutoTask(task) ||
    (task.assignee.id !== me.id && task.creator?.id !== me.id)
  ) {
    throw noPermissionError("待办事项", task.assignee.id);
  }
}

/**
 * @return excludes tasks that are done or created by the current user.
 */
const getLastTasksUpdatedAt = procedure
  .use(authUser())
  .output(zDateColumn)
  .query(async ({ ctx: { me } }) => {
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
  create,
  update,
  updateDone,
  getLastTasksUpdatedAt,
});

export async function createAutoTasks() {
  await sequelize.transaction(async (transaction) => {
    // Find all ongoing mentorships
    const mentorships = await db.Mentorship.findAll({
      where: whereMentorshipIsOngoing,
      attributes: [],
      include: [
        {
          association: "mentor",
          attributes: ["id", "state"],
        },
      ],
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

export async function createAutoTask(
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
    await db.Task.create(
      {
        assigneeId,
        autoTaskId,
        done: false,
      },
      { transaction },
    );
  }

  await scheduleEmail("Task", assigneeId, transaction);
}
