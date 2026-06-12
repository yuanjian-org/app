import { useState, useMemo } from "react";
import { Heading, SimpleGrid, Text, VStack, Flex, Box } from "@chakra-ui/react";
import { trpcNext } from "../../../trpc";
import { barePage } from "../../../AppPage";
import PageLoader from "../../../components/PageLoader";
import { FullTextSearchBox } from "../../../components/FullTextSearchBox";
import TopBar from "../../../components/TopBar";
import { componentSpacing, pageMarginX } from "../../../theme/metrics";
import {
  ProjectCard,
  searchProjects,
} from "../../../components/projects/ProjectList";

export default barePage(() => {
  const { data: projects } = trpcNext.projects.listPublic.useQuery();
  const [searchTerm, setSearchTerm] = useState("");

  const searchResult = useMemo(() => {
    return searchTerm && projects
      ? searchProjects(projects, searchTerm)
      : projects;
  }, [searchTerm, projects]);

  if (projects === undefined) return <PageLoader />;

  return (
    <Box maxW="1200px" mx="auto" w="100%">
      <TopBar px={pageMarginX} py={componentSpacing}>
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
      </TopBar>
      {searchResult && searchResult.length === 0 ? (
        <Text mx={pageMarginX} mt={pageMarginX}>
          暂无项目
        </Text>
      ) : (
        <SimpleGrid
          spacing={componentSpacing}
          templateColumns="repeat(auto-fill, minmax(270px, 1fr))"
          mx={pageMarginX}
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
