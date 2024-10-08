import { procedure, router } from "../../trpc";
import { authUser } from "../../auth";
import { z } from "zod";
import { 
  zLatitude,
  zLandmark, 
  Landmark, 
  zLandmarkAssessment,
  LandmarkAssessment,
 } from "shared/Map";
import * as fs from 'fs';
import * as path from 'path';
import db from "../../database/db";
import { 
  landmarkAssessmentAttributes 
} from "../../database/models/map/attributesAndIncludes";
import { landmarkAssessmentInclude } from "../../database/models/map/attributesAndIncludes";

const list = procedure
  .use(authUser())
  .input(zLatitude)
  .output(z.array(zLandmark))
  .query(async ({ input : latitude }) =>
{
  const landmarkDataPath = path.join(process.cwd(), 'public', 'map', latitude);
  const files = await fs.promises.readdir(landmarkDataPath);

  return Promise.all(
    files
    .filter(file => path.extname(file) === '.json')
    .map(async file => {
      const filePath = path.join(landmarkDataPath, file);
      const fileContent = await fs.promises.readFile(filePath, 'utf8');
      const landmark = JSON.parse(fileContent);
      return {
          ...landmark,
          名称: path.basename(file, '.json'),
      } as Landmark;
    }));
});

const listLandmarkAssessment = procedure
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
  list,
  listLandmarkAssessment
});
