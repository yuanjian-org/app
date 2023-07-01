import { procedure, router } from "../trpc";
import { z } from "zod";
import { authUser } from "../auth";
import { zRoles } from "../../shared/Role";
import User from "../database/models/User";
import { TRPCError } from "@trpc/server";
import { Op } from "sequelize";
import { presentPublicUser } from "../../shared/PublicUser";
import UserProfile from "shared/UserProfile";

const users = router({
  create: procedure
  .use(authUser('ADMIN'))
  .input(z.object({
    name: z.string().min(1, "required"),
    pinyin: z.string(),
    email: z.string().email(),
    clientId: z.string().min(1, "required"),
    roles: zRoles.min(1, "required"),
  }))
  .mutation(async ({ input, ctx }) => {
    const user = await User.findOne({
      where: {
        clientId: input.clientId
      }
    });

    if (user) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'this user is already created in our db',
      });
    }

    await User.create({
      name: input.name,
      pinyin: input.pinyin,
      email: input.email,
      roles: input.roles,
      clientId: input.clientId
    });

    return 'ok' as const;
  }),

  search: procedure
  .use(authUser('ADMIN'))
  .input(z.object({
    query: z.string(),
  }))
  .query(async ({ input }) => {
    const users = await User.findAll({
      where: {
        [Op.or]: [
          { pinyin: { [Op.iLike]: `%${input.query}%` } },
          { name: { [Op.iLike]: `%${input.query}%` } },
          { email: { [Op.iLike]: `%${input.query}%` } },
        ],
      }
    });

    return {
      users: users.map(presentPublicUser),
    }
  }),

  listUsers: procedure
  .use(authUser('ADMIN'))
  .query(async () => {
    return {
      users: await User.findAll({ order: [['pinyin', 'ASC']] }) as UserProfile[]
    };
  })
});

export default users;
