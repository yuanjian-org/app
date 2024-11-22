import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import {
  zLatitude,
  zLandmark,
  zLandmarkAssessment,
  LandmarkAssessment,
} from 'shared/Map';
import { promises as fs } from 'fs';
import * as path from 'path';
import db from "../database/db";
import { 
  landmarkAssessmentAttributes,
  landmarkAssessmentInclude,
} from "../database/models/map/attributesAndIncludes";
import sequelize from "../database/sequelize";

const listLandmarks = procedure
  .use(authUser())
  .input(z.array(zLatitude))
  .output(z.record(z.string(), z.array(zLandmark)))
  .query(async ({ input : latitudes }) =>
{
  const data = await Promise.all(
      latitudes.map(async (latitude) => {
        const landmarkDataPath = path.join(process.cwd(), 'public', 'map',
            latitude);
        const files = await fs.readdir(landmarkDataPath);
        const landmarks = await Promise.all(
            files
            .filter(file => path.extname(file) === '.json')
            .map(async file => {
              const filePath = path.join(landmarkDataPath, file);
              const fileContent = await fs.readFile(filePath, 'utf8');
              const landmark = JSON.parse(fileContent);
              return {
                ...landmark,
                名称: path.basename(file, '.json'),
              };
            })
        );
        return { [latitude]: landmarks };
      }));
      return data.reduce((acc, item) => ({ ...acc, ...item }), {});
});

const createLandmarkAssessment = procedure
  .use(authUser())
  .input(z.object({
    userId: z.string(),
    landmark: z.string(),
    score: z.number(),
    markdown: z.string().nullable(),
  }))
  .mutation(async ({ input }) => {
    return await sequelize.transaction(async transaction => {
      const { userId, landmark, score, markdown } = input;
      
      await db.LandmarkAssessment.create({
        userId,
        landmark,
        score,
        markdown,
      }, { transaction });
    });
  });

const listLandmarkAssessments = procedure
  .use(authUser())
  .input(z.object({ 
    userId: z.string(), 
    landmark: z.string() 
  }))
  .output(z.array(zLandmarkAssessment))
  .query(async ({ input : { userId, landmark } }) =>
{
  // Missing 'as' type casting will cause an error due to
  // 'createdAt' is optional in 'LandmarkAssessment' but required in return type
  return await db.LandmarkAssessment.findAll({
    where: { userId, landmark },
    attributes: landmarkAssessmentAttributes,
    include: landmarkAssessmentInclude,
  }) as LandmarkAssessment[]; 
});

export default router({
  listLandmarks,
  createLandmarkAssessment,
  listLandmarkAssessments,
});
