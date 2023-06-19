import { procedure, router } from "../tServer";
import { z } from "zod";
import auth from "../auth";
import apiEnv from "../apiEnv";
import User from "../database/models/User";
import { IUser } from "../../shared/user";
import { Role } from "../../shared/RBAC";
import invariant from "tiny-invariant";
import pinyin from 'tiny-pinyin';
import { UniqueConstraintError } from "sequelize";

async function findUser(clientId: string): Promise<User | null> {
  return await User.findOne({ where: { clientId: clientId } });
}

const user = router({
  /**
   * This is a public API available to all when the user logged in for the first time.
   */
  profile: procedure.input(
    z.object({}),
  ).query(async ({ input, ctx }) => {
    // Return null when the user is logged out.
    if (!ctx.authingUser) return null;
    invariant(ctx.authingUser.email);
    const u = await createUserIfNotExist(ctx.authingUser.id, ctx.authingUser.email);
    return u as IUser;
  }),

  updateProfile: procedure.use(
    auth('profile:write')
  ).input(
    z.object({ name: z.string().min(1, "required")})
  ).mutation(async ({ input, ctx }) => {
    const u = await findUser(ctx.authingUser.id);
    invariant(u);
    await u.update({
      name: input.name,
      pinyin: pinyin.convertToPinyin(input.name),
    });
  })
});

export default user;

async function createUserIfNotExist(clientId: string, email: string): Promise<User> {
  invariant(email);

  /**
   * Frontend calls user.profile multiple times when a new user logs in, causing parallel User.create() from time to
   * time which results in unique constraint errors.
   * 
   * As a speed optimization, we simply retry on such errors instead of using pessimistic locking.
   * 
   * TODO: Fix the frontend to suppress unnecessary calls to user.profile.
   */
  while (true) {
    const user = await findUser(clientId);
    if (user) return user;

    const isAdmin = apiEnv.ASSIGN_ADMIN_ROLE_ON_SIGN_UP.includes(email);
    const roles: [Role] = [isAdmin ? 'ADMIN' : 'VISITOR'];
    console.log(`Creating user ${email} roles ${roles} id ${clientId}`);
    try {
      return await User.create({
        name: "",
        pinyin: "",
        email,
        clientId,
        roles,
      });
    } catch (e) {
      if (e instanceof UniqueConstraintError) {
        console.log(`Unique constraint error when creating user ${email}. Assuming user already exists. Retry.`);
      } else {
        throw e;
      }
    }
  }
}
