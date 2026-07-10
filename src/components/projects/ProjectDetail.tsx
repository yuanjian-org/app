// @i18n-ignore-file
import {
  Button,
  Flex,
  Heading,
  Text,
  VStack,
  Divider,
  Card,
  CardBody,
  Badge,
  Tooltip,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { MdEdit } from "react-icons/md";
import MarkdownStyler from "../../components/MarkdownStyler";
import {
  ProjectStatusDescriptions,
  ProjectVisibilityDescriptions,
  ProjectWithAssociation,
} from "../../shared/Project";

export function ProjectDetailCard({
  project,
  canEdit,
  isLoadingApply,
  onApply,
}: {
  project: ProjectWithAssociation;
  canEdit: boolean;
  isLoadingApply: boolean;
  onApply: () => void;
}) {
  return (
    <Card>
      <CardBody>
        <Flex justify="space-between" align="start" mb={4}>
          <Flex direction="column" width="100%">
            <Heading size="xl" mb={2} width="100%">
              {project.title}
            </Heading>
            <Flex align="center" gap={2}>
              <Text fontSize="md" color="gray.500" me={10}>
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

              {project.status !== "招募中" && (
                <Tooltip
                  label={ProjectStatusDescriptions[project.status]}
                  hasArrow
                >
                  <Badge
                    colorScheme={project.status === "已结束" ? "red" : "gray"}
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
                  <Badge colorScheme="purple">{project.visibility}</Badge>
                </Tooltip>
              )}
            </Flex>
          </Flex>
          <Flex gap={2} shrink={0}>
            {canEdit && (
              <Button
                as={NextLink}
                href={`/projects/${project.id}/edit`}
                leftIcon={<MdEdit />}
              >
                编辑项目
              </Button>
            )}
            {canEdit && (
              <Button
                as={NextLink}
                href={`/projects/${project.id}/applications`}
              >
                查看申请
              </Button>
            )}
            {!canEdit && project.status === "招募中" && (
              <Button
                colorScheme="brand"
                isLoading={isLoadingApply}
                onClick={onApply}
              >
                申请参加
              </Button>
            )}
          </Flex>
        </Flex>

        <Divider my={6} />

        <VStack spacing={6} align="stretch">
          <Section title={"所属机构"} content={project.org?.name} />
          <Section title={"项目简介"} content={project.profile?.简介} />
          <Section title={"项目背景"} content={project.profile?.背景} />
          <Section title={"挑战描述"} content={project.profile?.挑战描述} />
          <Section title={"学生要求"} content={project.profile?.学生要求} />
          <VideoSection title={"视频链接"} url={project.profile?.视频链接} />
          <Section title={"参考材料"} content={project.profile?.参考材料} />
        </VStack>
      </CardBody>
    </Card>
  );
}

export function Section({
  title,
  content,
}: {
  title: string;
  content?: string;
}) {
  if (!content) return null;
  return (
    <Flex direction="column">
      <Heading size="md" mb={3} color="brand.a">
        {title}
      </Heading>
      <MarkdownStyler content={content} />
    </Flex>
  );
}

export function VideoSection({ title, url }: { title: string; url?: string }) {
  if (!url) return null;
  return (
    <Flex direction="column">
      <Heading size="md" mb={3} color="brand.a">
        {title}
      </Heading>
      <video
        src={url}
        controls
        controlsList="nodownload"
        style={{
          maxWidth: "600px",
          maxHeight: "600px",
        }}
      />
    </Flex>
  );
}
