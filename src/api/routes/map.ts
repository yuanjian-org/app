import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import {
  zLatitude,
  zLandmark,
  Landmark,
  zLandmarkAssessment,
  LandmarkAssessment,
} from "shared/Map";
import * as fs from "fs";
import * as path from "path";
import db from "../database/db";
import { isPermitted } from "../../shared/Role";
import { noPermissionError } from "../errors";
import {
  landmarkAssessmentAttributes,
  landmarkAssessmentInclude,
} from "../database/models/map/attributesAndIncludes";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";

const listLandmarks = procedure
  .use(authUser())
  .input(zLatitude)
  .output(z.array(zLandmark))
  .query(async ({ input: latitude }) => {
    const landmarkDataPath = path.join(
      process.cwd(),
      "public",
      "map",
      latitude,
    );
    const files = await fs.promises.readdir(landmarkDataPath);

    return Promise.all(
      files
        .filter((file) => path.extname(file) === ".json")
        .map(async (file) => {
          const filePath = path.join(landmarkDataPath, file);
          const fileContent = await fs.promises.readFile(filePath, "utf8");
          const landmark = JSON.parse(fileContent);
          return {
            ...landmark,
            名称: path.basename(file, ".json"),
          } as Landmark;
        }),
    );
  });

export async function createLandmarkAssessmentImpl(
  userId: string,
  landmark: string,
  score: number,
  markdown: string | null,
  transaction: Transaction,
) {
  await db.LandmarkAssessment.create(
    {
      userId,
      landmark,
      score,
      markdown,
    },
    { transaction },
  );
}

const createLandmarkAssessment = procedure
  .use(authUser())
  .input(
    z.object({
      userId: z.string(),
      landmark: z.string(),
      score: z.number(),
      markdown: z.string().nullable(),
    }),
  )
  .mutation(async ({ ctx: { me }, input }) => {
    if (
      me.id !== input.userId &&
      !isPermitted(me.roles, [
        "MentorshipAssessor",
        "MentorshipManager",
        "UserManager",
      ])
    ) {
      throw noPermissionError("评估", input.userId);
    }
    return await sequelize.transaction(async (transaction) => {
      await createLandmarkAssessmentImpl(
        input.userId,
        input.landmark,
        input.score,
        input.markdown,
        transaction,
      );
    });
  });

export async function listLandmarkAssessmentsImpl(
  userId: string,
  landmark: string,
  transaction?: Transaction,
) {
  // Missing 'as' type casting will cause an error due to
  // 'createdAt' is optional in 'LandmarkAssessment' but required in
  // return type
  return (await db.LandmarkAssessment.findAll({
    where: { userId, landmark },
    attributes: landmarkAssessmentAttributes,
    include: landmarkAssessmentInclude,
    transaction,
  })) as LandmarkAssessment[];
}

const listLandmarkAssessments = procedure
  .use(authUser())
  .input(
    z.object({
      userId: z.string(),
      landmark: z.string(),
    }),
  )
  .output(z.array(zLandmarkAssessment))
  .query(async ({ ctx: { me }, input: { userId, landmark } }) => {
    if (
      me.id !== userId &&
      !isPermitted(me.roles, [
        "MentorshipAssessor",
        "MentorshipManager",
        "UserManager",
      ])
    ) {
      throw noPermissionError("评估", userId);
    }
    return await listLandmarkAssessmentsImpl(userId, landmark);
  });

export default router({
  listLandmarks,
  createLandmarkAssessment,
  listLandmarkAssessments,
});
