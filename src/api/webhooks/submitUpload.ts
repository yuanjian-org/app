import { procedure } from "../trpc";
import z from "zod";
import { generalBadRequestError } from "../errors";
import db from "../database/db";

/**
 * The Webhook for 金数据 form https://jsj.top/f/Bz3uSO
 */
export default procedure
  .input(z.record(z.string(), z.any()))
  .mutation(async ({ input: { form, entry } }) => 
{
  if (form !== "Bz3uSO") {
    throw generalBadRequestError(`金数据 form id ${form} is not suppoted.`);
  }

  const uploader: string = entry.field_2;
  const urls: string[] = entry.field_1;

  await db.Upload.create({ uploader, urls });
});
