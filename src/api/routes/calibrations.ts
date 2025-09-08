import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { InterviewType, zInterviewType } from "../../shared/InterviewType";
import sequelize from "../database/sequelize";
import {
  generalBadRequestError,
  noPermissionError,
  notFoundError,
} from "../errors";
import { zCalibration } from "../../shared/Calibration";
import {
  calibrationAttributes,
  interviewInclude,
  interviewAttributes,
  calibrationInclude,
} from "../database/models/attributesAndIncludes";
import { Transaction } from "sequelize";
import invariant from "tiny-invariant";
import Calibration from "api/database/models/Calibration";
import { zInterview } from "../../shared/Interview";
import { isPermitted } from "../../shared/Role";
import User from "../../shared/User";

const create = procedure
  .use(authUser("MentorshipManager"))
  .input(
    z.object({
      type: zInterviewType,
      name: z.string(),
    }),
  )
  .mutation(async ({ input }) => {
    await sequelize.transaction(async (transaction) => {
      await createCalibration(input.type, input.name, false, transaction);
    });
  });

/**
 * @returns the calibration id.
 */
export async function createCalibration(
  type: InterviewType,
  name: string,
  active: boolean,
  transaction: Transaction,
): Promise<string> {
  if (!name.length) throw generalBadRequestError("名称不能为空");
  const c = await db.Calibration.create(
    { type, name, active },
    { transaction },
  );
  return c.id;
}

const update = procedure
  .use(authUser("MentorshipManager"))
  .input(
    z.object({
      id: z.string(),
      name: z.string(),
      active: z.boolean(),
    }),
  )
  .mutation(async ({ input }) => {
    const [affected] = await db.Calibration.update(
      {
        name: input.name,
        active: input.active,
      },
      {
        where: { id: input.id },
      },
    );

    invariant(affected <= 1);
    if (!affected) throw notFoundError("面试讨论", input.id);
  });

const setManager = procedure
  .use(authUser("MentorshipManager"))
  .input(
    z.object({
      calibrationId: z.string(),
      managerId: z.string().nullable(),
    }),
  )
  .mutation(async ({ input: { calibrationId, managerId } }) => {
    const [affected] = await db.Calibration.update(
      { managerId },
      {
        where: { id: calibrationId },
      },
    );

    invariant(affected <= 1);
    if (!affected) throw notFoundError("面试讨论", calibrationId);
  });

const list = procedure
  .use(authUser("MentorshipManager"))
  .input(zInterviewType)
  .output(z.array(zCalibration))
  .query(async ({ input: type }) => {
    return await db.Calibration.findAll({
      where: { type },
      attributes: calibrationAttributes,
      include: calibrationInclude,
    });
  });

const listMine = procedure
  .use(authUser())
  .output(z.array(zCalibration))
  .query(async ({ ctx: { me } }) => {
    return await sequelize.transaction(async (transaction) => {
      const cids = (
        await db.Calibration.findAll({
          attributes: ["id"],
          where: { active: true },
          transaction,
        })
      ).map((c) => c.id);

      const cs: Calibration[] = [];
      for (const cid of cids) {
        const c = await getCalibrationAndCheckPermissionSafe(
          me,
          cid,
          transaction,
        );
        if (c) cs.push(c);
      }
      return cs;
    });
  });

/**
 * See `checkPermission` on access control.
 *
 * TODO: return zCaibrationWithInterview and merge with getInterviews?
 */
const get = procedure
  .use(authUser())
  .input(z.string())
  .output(zCalibration)
  .query(async ({ ctx: { me }, input: id }) => {
    return await sequelize.transaction(async (transaction) => {
      return await getCalibrationAndCheckPermission(me, id, transaction);
    });
  });

/**
 * See `checkCalibrationPermission` on access control.
 *
 * @param Calibration id
 *
 * TODO: merge into `get` which should return zCaibrationWithInterview?
 */
const getInterviews = procedure
  .use(authUser())
  .input(z.string())
  .output(z.array(zInterview))
  .query(async ({ ctx: { me }, input: calibrationId }) => {
    return await sequelize.transaction(async (transaction) => {
      await getCalibrationAndCheckPermission(me, calibrationId, transaction);

      return await db.Interview.findAll({
        where: { calibrationId },
        attributes: interviewAttributes,
        include: interviewInclude,
        transaction,
      });
    });
  });

export default router({
  create,
  update,
  list,
  listMine,
  get,
  getInterviews,
  setManager,
});

async function getCalibrationAndCheckPermission(
  me: User,
  calibrationId: string,
  transaction: Transaction,
): Promise<Calibration> {
  const c = await getCalibrationAndCheckPermissionSafe(
    me,
    calibrationId,
    transaction,
  );
  if (!c) throw noPermissionError("面试讨论", calibrationId);
  return c;
}

/**
 * Only MentorshipManager and participants of the calibration are allowed.
 * In the latter case, the calibration must be active.
 *
 * @return the calibration if access is allowed. null otherwise
 *
 * TODO: optimize queries. combine queries from the call site.
 */
export async function getCalibrationAndCheckPermissionSafe(
  me: User,
  calibrationId: string,
  transaction: Transaction,
): Promise<Calibration | null> {
  const c = await db.Calibration.findByPk(calibrationId, {
    attributes: calibrationAttributes,
    include: calibrationInclude,
    transaction,
  });
  if (!c) throw notFoundError("面试讨论", calibrationId);

  if (isPermitted(me.roles, "MentorshipManager")) return c;

  if (!c.active) return null;

  // Check if the user is a participant (interviewer) in this calibration
  const participant = await db.InterviewFeedback.count({
    where: {
      interviewerId: me.id,
    },
    include: [
      {
        model: db.Interview,
        where: {
          calibrationId: calibrationId,
        },
      },
    ],
    transaction,
  });

  if (!participant) return null;

  return c;
}
