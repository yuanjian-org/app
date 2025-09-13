import { procedure, router } from "../trpc";
import { z } from "zod";
import Role, { RoleProfiles } from "../../shared/Role";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { authUser } from "../auth";
import { generalBadRequestError } from "../errors";
import { MenteeStatus } from "../../shared/MenteeStatus";
import { invalidateUserCache } from "../../pages/api/auth/[...nextauth]";
import { toPinyin } from "../../shared/strings";
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
      await validatePearlStudent(
        me,
        input.name,
        input.pearlId,
        input.nationalIdLastFour,
        input.wechat,
        transaction,
      );
    });
  });

export async function validatePearlStudent(
  me: User,
  name: string,
  pearlId: string,
  nationalIdLastFour: string,
  wechat: string,
  transaction: Transaction,
) {
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
    notifyRolesIgnoreError(
      ["UserManager"],
      "珍珠生验证失败",
      `用户 ${me.id} 认证珍珠生失败："${name}"、"${pearlId}"、"${nationalIdLastFour}"`,
    );

    throw generalBadRequestError("珍珠生信息不匹配。");
  }

  if (student.userId) {
    notifyRolesIgnoreError(
      ["UserManager"],
      "珍珠生重复验证",
      `用户 ${me.id} （${name}）试图用已被验证的珍珠生号 ${pearlId} 进行验证。请联系学生管理员。`,
    );

    throw generalBadRequestError(
      `此珍珠生号已被验证。请联系${RoleProfiles.UserManager.displayName}。`,
    );
  }

  // Force type checks
  const menteeRole: Role = "Mentee";
  const accepted: MenteeStatus = "现届学子";
  const transactionalOnly: MenteeStatus = "仅不定期";

  const menteeStatus =
    me.menteeStatus === accepted ? accepted : transactionalOnly;

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

  // TODO: Consolidate with users.ts:createUser.
  await user.update(
    {
      name,
      pinyin: toPinyin(name),
      wechat,
      roles: [...me.roles.filter((r) => r !== menteeRole), menteeRole],
      menteeStatus,
      menteeApplication,
    },
    { transaction },
  );

  invalidateUserCache(me.id);
}

const upload = procedure
  .use(authUser())
  .input(
    z.object({
      csvData: z.string(),
    }),
  )
  .mutation(async ({ input }) => {
    const { csvData } = input;

    // Parse CSV data
    const lines = csvData.trim().split("\n");

    // Parse and validate data
    const students: Array<{
      name: string;
      pearlId: string;
      lowerCaseNationalIdLastFour: string | null;
    }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(",").map((v) => v.trim());
      if (values.length < 2) {
        throw generalBadRequestError(`第${i + 1}行数据不完整`);
      }

      const name = values[0];
      const pearlId = values[1];
      const nationalIdLastFour = values[2] || null;

      if (!name || !pearlId) {
        throw generalBadRequestError(`第${i + 1}行：姓名和珍珠生编号不能为空`);
      }

      if (nationalIdLastFour && nationalIdLastFour.length !== 4) {
        throw generalBadRequestError(
          `第${i + 1}行：身份证号最后四位必须是4位数字`,
        );
      }

      students.push({
        name,
        pearlId,
        lowerCaseNationalIdLastFour: nationalIdLastFour?.toLowerCase() || null,
      });
    }

    // Use transaction to ensure atomicity
    const result = await sequelize.transaction(async (transaction) => {
      let updatedCount = 0;
      let insertedCount = 0;

      for (const student of students) {
        const existing = await db.PearlStudent.findByPk(student.pearlId, {
          attributes: ["pearlId"],
          transaction,
        });

        if (existing) {
          // Update existing record
          await existing.update(student, { transaction });
          updatedCount++;
        } else {
          // Insert new record
          await db.PearlStudent.create(student, { transaction });
          insertedCount++;
        }
      }

      return {
        total: students.length,
        updated: updatedCount,
        inserted: insertedCount,
      };
    });

    return result;
  });

export default router({
  validate,
  upload,
});
