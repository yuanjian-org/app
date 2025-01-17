import { z } from "zod";
import { zMinUser } from "./User";
import { zDateColumn } from "./DateColumn";

export const zAutoTaskId = z.enum([
  "study-comms",
]);
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
  creator: zMinUser.nullable(),
  // This field is used only when creator is null.
  autoTaskId: zAutoTaskId.nullable(),
  // This field is used only when creator is not null.
  markdown: z.string().nullable(),
  done: z.boolean(),
  updatedAt: zDateColumn,
});
export type Task = z.TypeOf<typeof zTask>;
