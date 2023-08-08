import { procedure } from "../trpc";
import z from "zod";
import { generalBadRequestError, notFoundError } from "../errors";
import db from "../database/db";

/**
 * The Webhook for 金数据 form https://jinshuju.net/f/w02l95.
 */
export default procedure
  .input(z.record(z.string(), z.any()))
  .mutation(async ({ input }) => submit(input));

export async function submit({ form, entry }: Record<string, any>) {
  if (form !== "w02l95") {
    throw generalBadRequestError(`金数据 form id ${form} is not suppoted.`);
  }

  const name = entry.field_1;
  if (entry.exam_score < 120) {
    console.log(`MenteeInterviewerTest not passed for ${name}. Igored.`)
    return;
  }

  // There may be multiple users under the same name because users may have used wrong email to sign up.
  // Update all of them.
  const us = await db.User.findAll({
    where: { name }
  });
  
  for (const u of us) {
    u.menteeInterviewerTestLastPassedAt = new Date().toISOString();
    await u.save();
  }
}
