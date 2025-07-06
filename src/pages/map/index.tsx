import {
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  SimpleGrid,
  Heading,
  Text,
  Card,
  CardHeader,
  CardBody,
} from "@chakra-ui/react";
import React, { useState } from "react";
import TabsWithUrlParam from "components/TabsWithUrlParam";
import { Landmark, Latitude, Latitudes } from "shared/Map";
import { componentSpacing } from "theme/metrics";
import LandmarkDrawer from "components/LandmarkDrawer";
import path from "path";
import { promises as fs } from "fs";

type PageProps = {
  data: Record<Latitude, Landmark[]>;
};

export default function Page({ data }: PageProps) {
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(
    null,
  );

  return (
    <>
      <TabsWithUrlParam isLazy>
        <TabList>
          {Object.keys(data).map((latitude) => (
            <Tab key={latitude}>{latitude}</Tab>
          ))}
        </TabList>

        <TabPanels>
          {Object.keys(data).map((latitude) => (
            <TabPanel key={latitude}>
              <LandmarkTabPanel
                landmarks={data[latitude as Latitude]}
                selectLandmark={setSelectedLandmark}
              />
            </TabPanel>
          ))}
        </TabPanels>
      </TabsWithUrlParam>

      {selectedLandmark && (
        <LandmarkDrawer
          onClose={() => setSelectedLandmark(null)}
          landmark={selectedLandmark}
        />
      )}
    </>
  );
}

const LandmarkTabPanel = ({
  landmarks,
  selectLandmark,
}: {
  landmarks: Landmark[];
  selectLandmark: (landmark: Landmark) => void;
}) => {
  return (
    <SimpleGrid
      spacing={componentSpacing}
      templateColumns="repeat(auto-fill, minmax(200px, 1fr))"
    >
      {landmarks.map((landmark, index) => (
        <LandmarkCard
          key={index}
          landmark={landmark}
          selectLandmark={selectLandmark}
        />
      ))}
    </SimpleGrid>
  );
};

const LandmarkCard = ({
  landmark,
  selectLandmark,
}: {
  landmark: Landmark;
  selectLandmark: (landmark: Landmark) => void;
}) => {
  return (
    <Card onClick={() => selectLandmark(landmark)} cursor="pointer">
      <CardHeader>
        <Heading size="md">{landmark.名称}</Heading>
      </CardHeader>
      <CardBody>
        <Text noOfLines={4}>{landmark.定义}</Text>
      </CardBody>
    </Card>
  );
};

export async function getStaticProps() {
  const data = await Promise.all(
    Latitudes.map(async (latitude) => {
      const landmarkDataPath = path.join(
        process.cwd(),
        "public",
        "map",
        latitude,
      );
      const files = await fs.readdir(landmarkDataPath);

      const landmarks = await Promise.all(
        files
          .filter((file) => path.extname(file) === ".json")
          .map(async (file) => {
            const filePath = path.join(landmarkDataPath, file);
            const fileContent = await fs.readFile(filePath, "utf8");
            const landmark = JSON.parse(fileContent);
            return {
              ...landmark,
              名称: path.basename(file, ".json"),
            };
          }),
      );
      return { [latitude]: landmarks };
    }),
  );

  const res = data.reduce((acc, item) => ({ ...acc, ...item }), {});
  return { props: { data: res } };
}
