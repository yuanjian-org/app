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
} from "@chakra-ui/react";
import NextLink from "next/link";
import {
  ProjectStatusDescriptions,
  ProjectVisibilityDescriptions,
  ProjectWithAssociation,
} from "../../shared/Project";
import { toPinyin } from "../../shared/strings/toPinyin";

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
