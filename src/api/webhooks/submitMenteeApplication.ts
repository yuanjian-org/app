import { procedure } from "../trpc";
import z from "zod";
import { generalBadRequestError } from "../errors";
import { createUser } from "../database/models/User";
import { emailRoleIgnoreError } from "../sendgrid";
import menteeApplicationFields, { menteeSourceField }
  from "../../shared/menteeApplicationFields";
import { UserProfile } from "shared/UserProfile";

/**
 * The Webhook for three 金数据 forms:
 *    * Mentee application: https://jsj.top/f/FBTWTe
 *    * Proxied mentee application: https://jsj.top/f/S74k0V
 *    * 馒头工坊 mentee application: https://jsj.top/f/Z82u8w
 */
export default procedure
  .input(z.record(z.string(), z.any()))
  .mutation(async ({ ctx, input }) => await submit(input, ctx.baseUrl));

export async function submit({ form, entry }: Record<string, any>, baseUrl: string) {
  if (form !== "FBTWTe" && form !== "S74k0V" && form !== "Z82u8w") {
    throw generalBadRequestError(`金数据 form id ${form} is not suppoted.`);
  }

  const application: Record<string, any> = {};
  for (const field of menteeApplicationFields) {
    const jn = form == "S74k0V" ? field.jsjProxiedField: field.jsjField;
    if (jn && jn in entry) {
      application[field.name] = entry[jn];
    }
  }

  if (form == "Z82u8w") {
    application[menteeSourceField] = "馒头工坊";
  }

  /**
   * All three forms share the same field names for the following fields.
   * Update code if/when they diverge.
   */
  const name = entry.field_104;

  // force type check
  const sexKey: keyof UserProfile = "性别";

  // Do not allow upsert to prevent accidental or malicious overwriting of
  // existing user data.
  await createUser({
    name,
    email: entry.field_113,
    wechat: entry.field_106,
    menteeApplication: application,
    roles: ["Mentee"],
    profile: { [sexKey]: entry.field_57 },
  });

  emailRoleIgnoreError("UserManager", "新学生申请", `姓名：${name}`, baseUrl);
}
