import { procedure, router } from "../../trpc";
import { authUser } from "../../auth";
import { z } from "zod";
import { 
  zLatitude,
  zLandmark, 
  Landmark, 
  zLandmarkScoreLog,
  LandmarkScoreLog,
 } from "shared/Map";
import * as fs from 'fs';
import * as path from 'path';
import db from "../../database/db";
import { 
  landmarkScoreLogAttributes 
} from "../../database/models/attributesAndIncludes";

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

const listLandmarkScoreLog = procedure
  .use(authUser())
  .input(z.object({ 
    userId: z.string(), 
    landmark: z.string() 
  }))
  .output(z.array(zLandmarkScoreLog))
  .query(async ({ input }) =>
{
  return await db.LandmarkScoreLog.findAll({
    where: { userId: input.userId, landmark: input.landmark },
    attributes: landmarkScoreLogAttributes,
  }) as LandmarkScoreLog[];
});

export default router({
  list,
  listLandmarkScoreLog
});
