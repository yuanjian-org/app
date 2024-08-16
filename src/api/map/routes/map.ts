/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable require-await */
import { procedure, router } from "../../trpc";
import { authUser } from "../../auth";
import { z } from "zod";
import { zRoles } from "shared/Role";

const zLandmark = z.object({
  定义: z.string(),
  经度: z.string(),
  纬度: z.string(),
  层级: z.array(z.string()),
  相关地标: z.array(z.string()),
  工具箱: z.string(),
});

//type Landmark = z.TypeOf<typeof zLandmark>;

const list = procedure
  .use(authUser())
  .input(z.object({
    name: z.string(),
    email: z.string(),
    id: z.string(),
    roles: zRoles,
  }))
  .output(z.array(zLandmark))
  .query(async ({ input }) =>
{
  return [];
});

export default router({
    list,
});
