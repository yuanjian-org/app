import { procedure, router } from "../../trpc";
import { authUser } from "../../auth";
import { z } from "zod";
import { zLatitude, zLandmark, Landmark } from "shared/Map";
import * as fs from 'fs';
import * as path from 'path';

const list = procedure
  .use(authUser())
  .input(zLatitude)
  .output(z.array(zLandmark))
  // eslint-disable-next-line require-await
  .query(async ({ input : latitude }) =>
{
  return await combineLandmarkJSONs(latitude);
});

export default router({
    list,
});

async function combineLandmarkJSONs(latitude: string): Promise<Landmark[]> {
  const landmarkDataPath = path.join(__dirname, '..', 'data', latitude);
  const files = await fs.promises.readdir(landmarkDataPath);

  const landmarkPromises = files
    .filter(file => path.extname(file) === '.json')
    .map(async file => {
      const filePath = path.join(landmarkDataPath, file);
      const fileContent = await fs.promises.readFile(filePath, 'utf8');
      return JSON.parse(fileContent) as Landmark;
    });

  return Promise.all(landmarkPromises);
}
