import {
  menteeApplicationFields,
  menteeSourceField,
  volunteerApplicationFields,
  volunteerApplyingforMentorField,
  volunteerApplyingforMentorFieldYes,
} from "../../../shared/applicationFields";
import { UserProfile } from "../../../shared/UserProfile";
import sequelize from "../../database/sequelize";
import db from "../../database/db";
import { checkAndComputeUserFields } from "../../routes/users";
import Role, { isPermitted } from "../../../shared/Role";
import { generalBadRequestError } from "../../errors";
import { chinaPhonePrefix, isValidPhone } from "../../../shared/strings";

/**
 * The Webhook for three 金数据 forms:
 *    * Mentee application: https://jsj.top/f/FBTWTe
 *    * Proxied mentee application: https://jsj.top/f/S74k0V
 *    * 馒头工坊 mentee application: https://jsj.top/f/Z82u8w
 */
export async function submitMenteeApp(
  formId: string,
  entry: Record<string, any>,
) {
  const application: Record<string, any> = {};
  for (const field of menteeApplicationFields) {
    const jn = formId == "S74k0V" ? field.jsjProxiedField : field.jsjField;
    if (jn && jn in entry) {
      application[field.name] = entry[jn];
    }
  }

  /**
   * All three forms share the same field names for the following fields.
   * Update code if/when they diverge.
   */
  const name = entry.field_104;
  const wechat = entry.field_106;
  const sex = entry.field_57;

  let phone: string | undefined;
  if (formId == "Z82u8w") {
    // 馒头工坊
    application[menteeSourceField] = "馒头工坊";
    phone = entry.field_173;
  } else if (formId == "S74k0V") {
    // Proxied mentee application
    phone = entry.field_175;
  } else if (formId == "FBTWTe") {
    // Mentee application
    phone = entry.field_171;
  } else {
    throw generalBadRequestError(`Unsupported form id: ${formId}`);
  }
  phone = phone ? chinaPhonePrefix + phone : phone;

  await save(
    "Mentee",
    phone,
    undefined,
    name,
    wechat,
    sex,
    undefined,
    application,
  );
}

/**
 * The Webhook for volunteer application: https://jsj.top/f/OzuvWD
 */
export async function submitVolunteerApp(entry: Record<string, any>) {
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

  const name = entry.field_4;
  const email = entry.field_8;
  const wechat = entry.field_9;
  const location = entry.field_23;
  const phone = entry.field_26;

  await save(
    "Volunteer",
    phone,
    email,
    name,
    wechat,
    undefined,
    location,
    application,
  );
}

/**
 * Phone number and name are required.
 */
async function save(
  type: "Mentee" | "Volunteer",
  phone: string | undefined,
  email: string | undefined,
  name: string | undefined,
  wechat: string | undefined,
  sex: string | undefined,
  location: string | undefined,
  application: Record<string, any>,
) {
  if (!phone) {
    throw generalBadRequestError("Phone number is required.");
  }
  if (!isValidPhone(phone)) {
    throw generalBadRequestError("Invalid phone number.");
  }
  if (!name) {
    throw generalBadRequestError("Name is required.");
  }

  const column =
    type == "Mentee" ? "menteeApplication" : "volunteerApplication";

  await sequelize.transaction(async (transaction) => {
    const user = await db.User.findOne({
      where: { phone },
      attributes: ["id", "roles", "profile", "url"],
      transaction,
    });

    // Force type check
    const sexKey: keyof UserProfile = "性别";
    const locationKey: keyof UserProfile = "现居住地";
    const profile = {
      ...(sex && { [sexKey]: sex }),
      ...(location && { [locationKey]: location }),
    };
    const addtionalRoles: Role[] = type == "Mentee" ? ["Mentee"] : [];

    if (user) {
      // Overwrite existing application
      await user.update(
        {
          phone,
          wechat,
          roles: user.roles
            .filter((role) => !addtionalRoles.includes(role))
            .concat(addtionalRoles),
          profile: { ...user.profile, ...profile },
          [column]: application,

          ...(await checkAndComputeUserFields({
            email,
            name,
            isVolunteer: isPermitted(user.roles, "Volunteer"),
            oldUrl: user.url,
            transaction,
          })),
        },
        { transaction },
      );
    } else {
      await db.User.create(
        {
          phone,
          wechat,
          roles: addtionalRoles,
          profile,
          [column]: application,

          ...(await checkAndComputeUserFields({
            email,
            name,
            isVolunteer: false,
            oldUrl: null,
            transaction,
          })),
        },
        { transaction },
      );
    }
  });
}
