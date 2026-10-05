// @i18n-ignore-file
import { useState, useMemo, ReactNode } from "react";
import {
  Flex,
  Heading,
  Text,
  CardHeader,
  CardBody,
  Badge,
  Tooltip,
  Spacer,
  Card,
  SimpleGrid,
  VStack,
  Box,
} from "@chakra-ui/react";
import NextLink from "next/link";
import {
  ProjectStatusDescriptions,
  ProjectVisibilityDescriptions,
  ProjectWithAssociation,
} from "../../shared/Project";
import { toPinyin } from "../../shared/strings/toPinyin";
import { FullTextSearchBox } from "../FullTextSearchBox";
import { componentSpacing, pageMarginX } from "../../theme/metrics";
import TopBar, { topBarPaddings } from "../TopBar";
import ProjectsLabel from "components/ProjectsLabel";

export function searchProjects(
  projects: ProjectWithAssociation[],
  searchTerm: string,
) {
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

export function ProjectCard({
  project,
  basePath = "/projects",
}: {
  project: ProjectWithAssociation;
  basePath?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <Flex direction="column" justify="space-between" align="start">
          <Heading size="md" width="100%">
            <NextLink href={`${basePath}/${project.id}`}>
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
    </Card>
  );
}

export interface ProjectListContainerProps {
  // List of projects to display
  projects: ProjectWithAssociation[];
  // Base path for project detail links
  basePath?: string;
  // Optional header action element
  headerAction?: ReactNode;
  // Whether to wrap the header inside TopBar
  useTopBar?: boolean;
  // Optional horizontal margin
  mx?: string | number | Record<string, string | number>;
}

export function ProjectListContainer({
  projects,
  basePath = "/projects",
  headerAction,
  useTopBar = false,
  mx,
}: ProjectListContainerProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const searchResult = useMemo(() => {
    return searchTerm && projects
      ? searchProjects(projects, searchTerm)
      : projects;
  }, [searchTerm, projects]);

  const headerContent = (
    <VStack spacing={componentSpacing} align="stretch">
      <Flex justify="space-between" align="center">
        <Heading size="lg">
          <ProjectsLabel />
        </Heading>
        {headerAction}
      </Flex>
      <FullTextSearchBox
        value={searchTerm}
        setValue={setSearchTerm}
        keywordPlaceholder="关键字或发起人"
      />
    </VStack>
  );

  return (
    <>
      {useTopBar ? (
        <TopBar {...topBarPaddings()}>{headerContent}</TopBar>
      ) : (
        <Box py={componentSpacing}>{headerContent}</Box>
      )}

      {searchResult && searchResult.length === 0 ? (
        <Text mx={mx} mt={pageMarginX}>
          暂无项目
        </Text>
      ) : (
        <SimpleGrid
          spacing={componentSpacing}
          templateColumns="repeat(auto-fill, minmax(270px, 1fr))"
          mx={mx}
          mt={pageMarginX}
        >
          {searchResult &&
            searchResult.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                basePath={basePath}
              />
            ))}
        </SimpleGrid>
      )}
    </>
  );
}
