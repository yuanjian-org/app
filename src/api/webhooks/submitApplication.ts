import { procedure } from "../trpc";
import z from "zod";
import { generalBadRequestError } from "../errors";
import { createUser } from "../database/models/User";
import {
  menteeApplicationFields,
  menteeSourceField,
  volunteerApplicationFields,
  volutneerNationalityField,
  volunteerApplyingforMentorField,
  volunteerApplyingforMentorFieldYes,
} from "../../shared/applicationFields";
import { UserProfile } from "shared/UserProfile";
import sequelize from "../database/sequelize";
import db from "../database/db";

/**
 * The Webhook for three 金数据 forms:
 *    * Mentee application: https://jsj.top/f/FBTWTe
 *    * Proxied mentee application: https://jsj.top/f/S74k0V
 *    * 馒头工坊 mentee application: https://jsj.top/f/Z82u8w
 */
export const submitMenteeApplication = procedure
  .input(z.record(z.string(), z.any()))
  .mutation(async ({ input }) => await submitMenteeApp(input));

export async function submitMenteeApp(
  { form, entry }: Record<string, any>,
) {
  if (form !== "FBTWTe" && form !== "S74k0V" && form !== "Z82u8w") {
    throw generalBadRequestError(`金数据 form id ${form} is not suppoted.`);
  }

  const application: Record<string, any> = {};
  for (const field of menteeApplicationFields) {
    const jn = form == "S74k0V" ? field.jsjProxiedField : field.jsjField;
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
  const email = entry.field_113;
  const wechat = entry.field_106;
  const sex = entry.field_57;

  await save("Mentee", email, name, wechat, sex, undefined, application);
}

/**
 * The Webhook for volunteer application: https://jsj.top/f/OzuvWD
 */
export const submitVolunteerApplication = procedure
  .input(z.record(z.string(), z.any()))
  .mutation(async ({ input: { form, entry } }) =>
{
  if (form !== "OzuvWD") {
    throw generalBadRequestError(`金数据 form id ${form} is not suppoted.`);
  }

  const application: Record<string, any> = {};
  for (const field of volunteerApplicationFields) {
    const jn = field.jsjField;
    if (jn && jn in entry) {
      application[field.name] = entry[jn];
    }
  }

  // This is a dropdown field asking if to apply as mentor.
  if (entry.field_25.length >= 1) {
    application[volunteerApplyingforMentorField] =
      volunteerApplyingforMentorFieldYes;
  }

  // For Chinese citizens, the field contains national ID number which we should
  // redact: "中国：110102...."
  application[volutneerNationalityField] = entry.field_22.startsWith("中国") ?
    "中国" : entry.field_22;

  const name = entry.field_4;
  const email = entry.field_8;
  const wechat = entry.field_9;
  const location = entry.field_23;

  await save("Volunteer", email, name, wechat, undefined, location, application);
});

async function save(
  type: "Mentee" | "Volunteer",
  email: string,
  name: string,
  wechat: string,
  sex: string | undefined,
  location: string | undefined,
  application: Record<string, any>
) {
  const column = type == "Mentee" ?
    "menteeApplication" : "volunteerApplication";

  await sequelize.transaction(async (transaction) => {
    const user = await db.User.findOne({
      where: { email },
      attributes: ["id", column, "profile"],
      transaction,
    });

    if (user) {
      // Do not allow overwriting existing application
      if (user[column]) {
        throw generalBadRequestError(`申请表已存在。用户 ${user.id}`);
      }

      await user.update({ [column]: application }, { transaction });

    } else {
      // Force type check
      const sexKey: keyof UserProfile = "性别";
      const locationKey: keyof UserProfile = "现居住地";
      await createUser({
        name,
        email,
        wechat,
        [column]: application,
        ...type == "Mentee" ? { roles: ["Mentee"] } : {},
        profile: {
          ...sex ? { [sexKey]: sex } : {},
          ...location ? { [locationKey]: location } : {},
        }
      }, transaction);
    }
  });
}
