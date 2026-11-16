import { procedure, router } from "../trpc";
import { z } from "zod";
import { addRole, displayName } from "../../shared/Role";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { authUser } from "../auth";
import { generalBadRequestError } from "../errors";
import { MenteeStatus } from "../../shared/MenteeStatus";
import { invalidateUserCache } from "../../pages/api/auth/[...nextauth]";
import { toPinyin } from "../../shared/strings/toPinyin";
import invariant from "../../shared/invariant";
import { menteeSourceField } from "../../shared/applicationFields";
import { Transaction } from "sequelize";
import User from "../../shared/User";
import { notifyRolesIgnoreError } from "api/notify";

const validate = procedure
  .use(authUser())
  .input(
    z.object({
      name: z.string(),
      pearlId: z.string(),
      nationalIdLastFour: z.string(),
      wechat: z.string(),
    }),
  )
  .mutation(async ({ ctx: { me }, input }) => {
    await sequelize.transaction(async (transaction) => {
      await validateImpl(
        me,
        input.name,
        input.pearlId,
        input.nationalIdLastFour,
        input.wechat,
        transaction,
      );
    });
  });

const pearlMaxFailedAttempts = 10;
const pearlLockoutMs = 15 * 60 * 1000;
const pearlValidationFailedAttempts = new Map<
  string,
  { count: number; firstFailedAt: number }
>();

export function clearPearlValidationFailedAttemptsForTest() {
  pearlValidationFailedAttempts.clear();
}

function isPearlRateLimited(key: string, now: number) {
  const info = pearlValidationFailedAttempts.get(key);
  return (
    info !== undefined &&
    now - info.firstFailedAt < pearlLockoutMs &&
    info.count >= pearlMaxFailedAttempts
  );
}

function recordPearlFailure(key: string, now: number) {
  const prev = pearlValidationFailedAttempts.get(key);
  if (!prev || now - prev.firstFailedAt >= pearlLockoutMs) {
    pearlValidationFailedAttempts.set(key, { count: 1, firstFailedAt: now });
  } else {
    prev.count += 1;
    if (prev.count >= pearlMaxFailedAttempts) {
      console.error(
        `Pearl student validation reached ${pearlMaxFailedAttempts} ` +
          `failed attempts for ${key}`,
      );
    }
  }
}

export async function validateImpl(
  me: User,
  name: string,
  pearlId: string,
  nationalIdLastFour: string,
  wechat: string,
  transaction: Transaction,
) {
  const now = Date.now();
  const userKey = `user:${me.id}`;
  const pearlKey = `pearl:${pearlId}`;
  if (isPearlRateLimited(userKey, now) || isPearlRateLimited(pearlKey, now)) {
    console.error(
      `Pearl student validation locked out after ${pearlMaxFailedAttempts} ` +
        `failed attempts for ${userKey} / ${pearlKey}`,
    );
    throw generalBadRequestError("验证尝试次数过多，请稍后再试。");
  }

  // Prevent a single user from claiming multiple PearlStudent records.
  const alreadyVerifiedCount = await db.PearlStudent.count({
    where: { userId: me.id },
    transaction,
  });
  if (alreadyVerifiedCount > 0) {
    throw generalBadRequestError("您已验证过珍珠生身份。");
  }

  const student = await db.PearlStudent.findOne({
    where: {
      pearlId,
      name,
      lowerCaseNationalIdLastFour: nationalIdLastFour.toLowerCase(),
    },
    attributes: ["pearlId", "userId"],
    lock: true,
    transaction,
  });

  if (!student) {
    recordPearlFailure(userKey, now);
    recordPearlFailure(pearlKey, now);
    notifyRolesIgnoreError(
      ["UserAdmin"],
      "珍珠生验证失败",
      `用户 ${me.id} 认证珍珠生失败：` +
        `"${name}"、"${pearlId}"、"${nationalIdLastFour}"`,
    );

    throw generalBadRequestError("珍珠生信息不匹配。");
  }

  if (student.userId) {
    recordPearlFailure(userKey, now);
    recordPearlFailure(pearlKey, now);
    notifyRolesIgnoreError(
      ["UserAdmin"],
      "珍珠生重复验证",
      `用户 ${me.id} （${name}）试图用已被验证的` +
        `珍珠生号 ${pearlId} 进行验证。请联系学生管理员。`,
    );

    throw generalBadRequestError(
      `此珍珠生号已被验证。` + `请联系${displayName("UserAdmin")}。`,
    );
  }

  pearlValidationFailedAttempts.delete(userKey);
  pearlValidationFailedAttempts.delete(pearlKey);

  // Update mentee status only if it is null.
  const menteeStatus: MenteeStatus =
    me.menteeStatus === null ? "现届学子" : me.menteeStatus;

  await student.update({ userId: me.id }, { transaction });

  const user = await db.User.findByPk(me.id, {
    attributes: ["id", "menteeApplication"],
    transaction,
  });
  invariant(user, `User not found: ${me.id}`);

  const menteeApplication = {
    ...user.menteeApplication,
    [menteeSourceField]: "珍珠生：" + pearlId,
  };

  // TODO: Consolidate with `createUser` in users.ts.
  await user.update(
    {
      name,
      pinyin: toPinyin(name),
      wechat,
      roles: addRole(me.roles, "Mentee"),
      menteeStatus,
      menteeApplication,
    },
    { transaction },
  );

  invalidateUserCache(me.id);
}

export default router({
  validate,
});
