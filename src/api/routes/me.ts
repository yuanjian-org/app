import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { zUserProfile } from "shared/UserProfile";

const profile = procedure
  .use(authUser())
  .output(zUserProfile)
  .query(async ({ ctx }) => ctx.user);

const me = router({
  profile,
});
export default me;
