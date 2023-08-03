import { procedure } from "../trpc";
import z from "zod";
import { generalBadRequestError } from "../errors";
import { createUser } from "../database/models/User";
import { emailRoleIgnoreError } from "../sendgrid";
import menteeApplicationFields from "../../shared/menteeApplicationFields";

/**
 * The Webhook for 金数据 forms https://jinshuju.net/f/FBTWTe (mentee application) and https://jinshuju.net/f/S74k0V
 * (proxied mentee application).
 */
export default procedure
  .input(z.record(z.string(), z.any()))
  .mutation(async ({ ctx, input }) => submit(input, ctx.baseUrl));

export async function submit({ form, entry }: Record<string, any>, baseUrl: string) {
  if (form !== "FBTWTe" && form !== "S74k0V") {
    throw generalBadRequestError(`金数据 form id ${form} is not suppoted.`);
  }

  const application: Record<string, any> = {};
  for (const field of menteeApplicationFields) {
    const jn = form == "FBTWTe" ? field.jsjField : field.jsjProxiedField;
    if (jn && jn in entry) {
      application[field.name] = entry[jn];
    }
  }

  /**
   * Both forms happen to share the same field names for the following fields. Update code if/when they diverge.
   */
  const name = entry.field_104;
  await createUser({
    name,
    sex: entry.field_57,
    email: entry.field_113,
    wechat: entry.field_106,
    menteeApplication: application,
    roles: ["Mentee"]
  }, "upsert");

  emailRoleIgnoreError("UserManager", "新学生申请", `姓名：${name}`, baseUrl);
}
