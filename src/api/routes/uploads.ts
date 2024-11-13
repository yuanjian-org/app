import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import db from "../database/db";
import { z } from "zod";
import { zUpload } from "shared/Upload";

/**
 * @returns files uploaded in the last 24 hours
 */
const list = procedure
  .use(authUser())
  .output(z.array(zUpload))
  .mutation(async () => 
{
  return await db.Upload.findAll({
    attributes: ["uploader", "urls", "createdAt"],
  });
});

export default router({
  list,
});
