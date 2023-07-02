import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { zUserProfile } from "shared/UserProfile";

const me = router({
  profile: procedure
  .use(authUser())
  .output(zUserProfile)
  .query(async ({ ctx }) => ctx.user),
});

export default me;
