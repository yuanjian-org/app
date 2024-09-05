import { procedure, router } from "../../trpc";
import { authUser } from "../../auth";
import { z } from "zod";
import { zLatitude, zLandmark, Landmark } from "shared/Map";
import * as fs from 'fs';
import * as path from 'path';

const list = procedure
  .use(authUser())
  .input(zLatitude)
  .output(z.array(zLandmark.extend({ fileName: z.string() })))
  .query(async ({ input : latitude }) =>
{
  const landmarkDataPath = path.join('src','api', 'map', 'data', latitude);
  const files = await fs.promises.readdir(landmarkDataPath);

  return Promise.all(
    files
    .filter(file => path.extname(file) === '.json')
    .map(async file => {
      const filePath = path.join(landmarkDataPath, file);
      const fileContent = await fs.promises.readFile(filePath, 'utf8');
      const landmark = JSON.parse(fileContent) as Landmark;
      return {
        ...landmark,
        fileName: file,
      };
    }));
});

export default router({
  list,
});
