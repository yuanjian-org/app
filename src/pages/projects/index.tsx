// @i18n-ignore-file
import { useState, useMemo } from "react";
import {
  Button,
  Flex,
  Heading,
  Text,
  SimpleGrid,
  VStack,
} from "@chakra-ui/react";
import { trpcNext } from "../../trpc";
import { useMyRoles } from "../../useMe";
import { isPermitted } from "../../shared/Role";
import NextLink from "next/link";
import { MdAdd } from "react-icons/md";
import TopBar, { topBarPaddings } from "../../components/TopBar";
import { fullPage } from "../../AppPage";
import { componentSpacing, pageMarginX } from "../../theme/metrics";
import { FullTextSearchBox } from "../../components/FullTextSearchBox";
import {
  ProjectCard,
  searchProjects,
} from "../../components/projects/ProjectList";
import Loader from "components/Loader";

export default fullPage(() => {
  const { data: projects } = trpcNext.projects.list.useQuery();
  const myRoles = useMyRoles();
  const canCreate = isPermitted(myRoles, ["Mentor", "ProjectAdmin"]);

  const [searchTerm, setSearchTerm] = useState<string>("");

  const searchResult = useMemo(() => {
    return searchTerm && projects
      ? searchProjects(projects, searchTerm)
      : projects;
  }, [searchTerm, projects]);

  if (projects === undefined) return <Loader />;

  return (
    <>
      <TopBar {...topBarPaddings()}>
        <VStack spacing={componentSpacing} align="stretch">
          <Flex justify="space-between" align="center">
            <Heading size="lg">X-Challenge 问题</Heading>
            {canCreate && (
              <Button
                as={NextLink}
                href="/projects/create"
                colorScheme="brand"
                leftIcon={<MdAdd />}
              >
                发布项目
              </Button>
            )}
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
                basePath="/projects"
              />
            ))}
        </SimpleGrid>
      )}
    </>
  );
}, "项目列表");
