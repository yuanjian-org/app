import path from "path";
import { promises as fs } from "fs";
import { Latitudes } from './Map';

export const readMapJsonFiles = async () => {
  const data = await Promise.all(
      [...Latitudes].map(async (latitude) => {
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
};