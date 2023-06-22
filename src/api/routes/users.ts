import { procedure, router } from "../tServer";
import { z } from "zod";
import { authUser } from "../auth";
import { ManagementClient } from 'authing-js-sdk'
import invariant from "tiny-invariant";
import apiEnv from "../apiEnv";
import { zRoleArr } from "../../shared/RBAC";
import User from "../database/models/User";
import { TRPCError } from "@trpc/server";
import { Op } from "sequelize";
import { IUser } from "../../shared/user";
import { presentPublicUser } from "../../shared/publicModels/PublicUser";

const managementClient = new ManagementClient({
  userPoolId: apiEnv.AUTHING_USER_POOL_ID,
  secret: apiEnv.AUTHING_USER_POOL_SECRET
});

const users = router({
  createInOurDb: procedure.use(
    authUser('users:write')
  ).input(z.object({
    name: z.string().min(1, "required"),
    pinyin: z.string(),
    email: z.string().email(),
    clientId: z.string().min(1, "required"),
    roles: zRoleArr.min(1, "required"),
  })).mutation(async ({ input, ctx }) => {
    invariant(!input.roles.find(r => r === "ADMIN"), "Admins should be created programmatically");

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

  search: procedure.use(
    authUser('users:read')
  ).input(z.object({
    offset: z.number(),
    limit: z.number(),
    query: z.string(),
  })).query(async ({ input, ctx }) => {
    const userList = await User.findAll({
      where: {
        [Op.or]: [
          { pinyin: { [Op.iLike]: `%${input.query}%` } },
          { name: { [Op.iLike]: `%${input.query}%` } },
          { email: { [Op.iLike]: `%${input.query}%` } },
        ],
      }
    });

    return {
      userList: userList.map(presentPublicUser),
    }
  }),

  listUsers: procedure.use(
    authUser('users:read')
  ).query(async () => {
    return {
      userList: await User.findAll() as IUser[]
    };
  })
});

export default users;
