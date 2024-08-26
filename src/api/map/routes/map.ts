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

// Combined all landmarks under a specific latitude into an array of objects
async function combineLandmarkJSONs(latitude: string): Promise<Landmark[]> {
  const landmarkDataPath = path.join(__dirname, '..', 'data', latitude);
  const landmarkArray: Landmark[] = [];

  try {
    // Use promise to ensure the code executes only after the file reading is completed.
    const files = await fs.promises.readdir(landmarkDataPath);

    for (const file of files) {
      if (path.extname(file) === '.json') {
        const filePath = path.join(landmarkDataPath, file);
        const fileContent = await fs.promises.readFile(filePath, 'utf8');

        try {
          const landmark: Landmark = JSON.parse(fileContent);
          landmarkArray.push(landmark);
        } catch (parseErr) {
          console.error(`Error parsing JSON from file ${file}: ${parseErr}`);
        }
      }
    }
  } catch (err) {
    console.error('Unable to scan directory:', err);
  }

  console.log(`Read and Parsed ${landmarkArray.length} landmarks from ${latitude}`);
  return landmarkArray;
};
