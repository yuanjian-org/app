import { procedure, router } from "../../trpc";
import { authUser } from "../../auth";
import { z } from "zod";

const list = procedure
  .use(authUser())
  .input(z.string())
  .output(z.array(z.object({})))
  .query(async ({ input: id }) =>
{
  return [];
});

export default router({
    list,
});
