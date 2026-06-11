import { useRouter } from "next/router";
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
import trpc, { trpcNext } from "../../trpc";
import useMe from "../../useMe";
import { isPermitted } from "../../shared/Role";
import NextLink from "next/link";
import { MdEdit } from "react-icons/md";
import MarkdownStyler from "../../components/MarkdownStyler";
import PageLoader from "../../components/PageLoader";
import Head from "next/head";
import {
  ProjectStatusDescriptions,
  ProjectVisibilityDescriptions,
} from "../../shared/Project";
import { getStandaloneFormUrl } from "pages/form";
import { useState } from "react";

export default function Page() {
  const router = useRouter();
  const id = router.query.id as string;
  const me = useMe();
  const [loading, setLoading] = useState(false);

  const { data: project } = trpcNext.projects.get.useQuery(
    { id },
    { enabled: !!id },
  );

  const handleApply = async () => {
    setLoading(true);
    try {
      const xField = await trpc.users.getJinshujuXField.query({
        projectId: id,
      });
      window.open(getStandaloneFormUrl("j6iUMC", xField), "_blank");
    } finally {
      setLoading(false);
    }
  };

  if (!project) return <PageLoader />;

  const canEdit =
    me && (me.id === project.ownerId || isPermitted(me.roles, "ProjectAdmin"));

  return (
    <>
      <Head>
        <title>{project.title} ｜ 远图</title>
      </Head>
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
              {project.status === "招募中" && (
                <Button
                  colorScheme="brand"
                  isLoading={loading}
                  onClick={handleApply}
                >
                  申请参与
                </Button>
              )}
            </Flex>
          </Flex>

          <Divider my={6} />

          <VStack spacing={6} align="stretch">
            <Section title="项目简介" content={project.profile?.简介} />
            <Section title="项目背景" content={project.profile?.背景} />
            <Section title="挑战描述" content={project.profile?.挑战描述} />
            <Section title="学生要求" content={project.profile?.学生要求} />
            <VideoSection title="视频链接" url={project.profile?.视频链接} />
            <Section title="参考材料" content={project.profile?.参考材料} />
          </VStack>
        </CardBody>
      </Card>
    </>
  );
}

function Section({ title, content }: { title: string; content?: string }) {
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

function VideoSection({ title, url }: { title: string; url?: string }) {
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
          maxWidth: "100%",
        }}
      />
    </Flex>
  );
}
