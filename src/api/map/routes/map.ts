import { procedure, router } from "../../trpc";
import { authUser } from "../../auth";
import { z } from "zod";
import { zLatitude, zLandmark } from "shared/Map";

const list = procedure
  .use(authUser())
  .input(zLatitude)
  .output(z.array(zLandmark))
  // eslint-disable-next-line no-unused-vars
  // eslint-disable-next-line require-await
  .query(async ({ input }) =>
{
  return [];
});

export default router({
    list,
});
