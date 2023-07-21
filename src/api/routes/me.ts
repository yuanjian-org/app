import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { zUser } from "shared/User";

const profile = procedure
  .use(authUser())
  .output(zUser)
  .query(async ({ ctx }) => ctx.user);

export default router({
  profile,
});
