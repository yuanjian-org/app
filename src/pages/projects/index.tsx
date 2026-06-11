import { useState, useMemo } from "react";
import {
  Button,
  Flex,
  Heading,
  Text,
  SimpleGrid,
  CardHeader,
  CardBody,
  Badge,
  Tooltip,
  Spacer,
  VStack,
} from "@chakra-ui/react";
import { trpcNext } from "../../trpc";
import { useMyRoles } from "../../useMe";
import { isPermitted } from "../../shared/Role";
import NextLink from "next/link";
import { MdAdd } from "react-icons/md";
import PageLoader from "../../components/PageLoader";
import { ResponsiveCard } from "../../components/ResponsiveCard";
import TopBar, { topBarPaddings } from "../../components/TopBar";
import { fullPage } from "../../AppPage";
import { componentSpacing, pageMarginX } from "../../theme/metrics";
import {
  ProjectStatusDescriptions,
  ProjectVisibilityDescriptions,
  ProjectWithOwner,
} from "../../shared/Project";
import { FullTextSearchBox } from "../../components/UserCards";
import { toPinyin } from "../../shared/strings";

function searchProjects(projects: ProjectWithOwner[], searchTerm: string) {
  const lower = searchTerm.trim().toLowerCase();

  const match = (v: string | null | undefined) => {
    if (!v) return false;
    const lowerV = v.toLowerCase();
    return [lowerV, toPinyin(lowerV)].some((s) => s.includes(lower));
  };

  return projects.filter((p) => {
    return (
      match(p.title) ||
      match(p.owner.name) ||
      (p.profile &&
        Object.entries(p.profile).some(
          ([key, value]) => key !== "视频链接" && match(value as string),
        ))
    );
  });
}

function ProjectCard({ project }: { project: ProjectWithOwner }) {
  return (
    <ResponsiveCard>
      <CardHeader>
        <Flex direction="column" justify="space-between" align="start">
          <Heading size="md" width="100%">
            <NextLink href={`/projects/${project.id}`}>
              <Text
                color="brand.a"
                _hover={{ textDecoration: "underline" }}
                width="100%"
              >
                {project.title}
              </Text>
            </NextLink>
          </Heading>
        </Flex>
      </CardHeader>
      <CardBody>
        <Flex align="center" gap={2} mb={4}>
          <Text fontSize="sm" color="gray.600">
            发起人：
            <NextLink href={`/users/${project.owner.id}`}>
              <Text
                as="span"
                color="brand.a"
                _hover={{ textDecoration: "underline" }}
              >
                {project.owner.name}
              </Text>
            </NextLink>
          </Text>

          <Spacer />

          {project.status !== "招募中" && (
            <Tooltip label={ProjectStatusDescriptions[project.status]} hasArrow>
              <Badge
                colorScheme={project.status === "已结束" ? "yellow" : "gray"}
              >
                {project.status}
              </Badge>
            </Tooltip>
          )}
          {project.visibility !== "公开" && (
            <Tooltip
              label={ProjectVisibilityDescriptions[project.visibility]}
              hasArrow
            >
              <Badge colorScheme="red">{project.visibility}</Badge>
            </Tooltip>
          )}
        </Flex>
        <Text noOfLines={3} color="gray.700">
          {project.profile?.简介 || "暂无简介"}
        </Text>
      </CardBody>
    </ResponsiveCard>
  );
}

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

  if (projects === undefined) return <PageLoader />;

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
              <ProjectCard key={project.id} project={project} />
            ))}
        </SimpleGrid>
      )}
    </>
  );
}, "项目列表");
