/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable require-await */
import { procedure, router } from "../../trpc";
import { authUser } from "../../auth";
import { z } from "zod";
import { zLatitudes, zLandmark } from "shared/Map";

const list = procedure
  .use(authUser())
  .input(zLatitudes)
  .output(z.array(zLandmark))
  .query(async ({ input }) =>
{
  return [];
});

export default router({
    list,
});
