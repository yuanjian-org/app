import { z } from "zod";
import { zMinUser } from "./User";
import { zDateColumn } from "./DateColumn";
import { prettifyDate } from "./strings";
import { defaultExamExpiryDays } from "./exams";
import { UserState } from "./UserState";
import invariant from "./invariant";
import moment from "moment";

export const zAutoTaskId = z.enum(["study-comms", "study-handbook"]);
export type AutoTaskId = z.TypeOf<typeof zAutoTaskId>;

/**
 * There are two types of tasks:
 * - Auto tasks: created by the system and assigned to a user.
 * - Manual tasks: created by a user and assigned to either another user or
 *   the same user.
 *
 * The task is an auto task if and only if the creator is null.
 */
export const zTask = z.object({
  id: z.number(),

  assignee: zMinUser,
  creator: zMinUser.nullable(),

  // This field is used only when creator is null.
  autoTaskId: zAutoTaskId.nullable(),

  // This field is used only when creator is not null.
  markdown: z.string().nullable(),

  done: z.boolean(),

  updatedAt: zDateColumn,
});
export type Task = z.TypeOf<typeof zTask>;

/**
 * @param assigneeState undefined if the user state is not loaded in frontend
 */
export function getTaskMarkdown(
  t: Task,
  assigneeState: UserState | undefined,
  baseUrl: string,
): string {
  if (t.autoTaskId === null) {
    invariant(t.markdown !== null, "both autoTaskId and markdown are null");
    return t.markdown;
  } else if (
    t.autoTaskId === "study-comms" ||
    t.autoTaskId === "study-handbook"
  ) {
    const link =
      t.autoTaskId === "study-comms"
        ? `[《学生通讯原则》](${baseUrl}/study/comms)`
        : `[《社会导师手册》](${baseUrl}/study/handbook)`;
    const base = `${link}自学与评测`;
    const examPassedAt =
      t.autoTaskId === "study-comms"
        ? assigneeState?.commsExam
        : assigneeState?.handbookExam;

    if (t.done || !assigneeState) {
      return `请完成${base}。`;
    } else if (!examPassedAt) {
      // The user has never passed the exam.
      return `请完成${base}，之后即可访问相关的学生资料。`;
    } else {
      // The user has passed the exam but about to expire.
      const expiry = moment(examPassedAt).add(defaultExamExpiryDays, "days");
      const expired = expiry.isBefore(moment());
      return (
        `${base}需每年完成一次。你的上次评测结果**${expired ? "已" : "将"}于` +
        `${prettifyDate(expiry.toDate())}过期**。` +
        `为确保继续访问学生资料，请尽早完成评测。`
      );
    }
  } else {
    invariant(false, "invalid autoTaskId");
  }
}

export function isAutoTask(task: Task) {
  invariant(
    (task.creator !== null) === (task.autoTaskId === null),
    `creator and autoTaskId: ${task.creator} ${task.autoTaskId}`,
  );
  return task.creator === null;
}
