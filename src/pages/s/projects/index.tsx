import { useState, useMemo } from "react";
import { Heading, SimpleGrid, Text, VStack, Flex, Box } from "@chakra-ui/react";
import { trpcNext } from "../../../trpc";
import { FullTextSearchBox } from "../../../components/FullTextSearchBox";
import { componentSpacing, pageMarginX } from "../../../theme/metrics";
import {
  ProjectCard,
  searchProjects,
} from "../../../components/projects/ProjectList";

import { widePage } from "../../../AppPage";
import T from "components/T";
import Loader from "components/Loader";

export default widePage(() => {
  const { data: projects } = trpcNext.projects.listPublic.useQuery();
  const [searchTerm, setSearchTerm] = useState("");

  const searchResult = useMemo(() => {
    return searchTerm && projects
      ? searchProjects(projects, searchTerm)
      : projects;
  }, [searchTerm, projects]);

  if (projects === undefined) return <Loader />;

  return (
    <Box w="100%">
      <Box py={componentSpacing}>
        <VStack spacing={componentSpacing} align="stretch">
          <Flex justify="space-between" align="center">
            <Heading size="lg">X-Challenge 问题</Heading>
          </Flex>
          <FullTextSearchBox
            value={searchTerm}
            setValue={setSearchTerm}
            keywordPlaceholder="关键字或发起人"
          />
        </VStack>
      </Box>
      {searchResult && searchResult.length === 0 ? (
        <Text mt={pageMarginX}>
          <T>暂无项目</T>
        </Text>
      ) : (
        <SimpleGrid
          spacing={componentSpacing}
          templateColumns="repeat(auto-fill, minmax(270px, 1fr))"
          mt={pageMarginX}
        >
          {searchResult &&
            searchResult.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                basePath="/s/projects"
              />
            ))}
        </SimpleGrid>
      )}
    </Box>
  );
}, "项目列表");

import getI18nProps from "components/getI18nProps";
export const getServerSideProps = getI18nProps;
