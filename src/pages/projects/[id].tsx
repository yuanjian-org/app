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
} from "@chakra-ui/react";
import { trpcNext } from "../../trpc";
import useMe from "../../useMe";
import { isPermitted } from "../../shared/Role";
import NextLink from "next/link";
import { MdEdit } from "react-icons/md";
import MarkdownStyler from "../../components/MarkdownStyler";
import PageLoader from "../../components/PageLoader";
import Head from "next/head";

export default function Page() {
  const router = useRouter();
  const id = router.query.id as string;
  const me = useMe();

  const { data: project } = trpcNext.projects.get.useQuery(
    { id },
    { enabled: !!id },
  );

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
            <Flex direction="column">
              <Heading size="xl" mb={2}>
                {project.title}
              </Heading>
              <Text fontSize="md" color="gray.500">
                发起人：{project.owner?.name || "未知"}，状态：
                {project.status === "Open"
                  ? "招募中"
                  : project.status === "Closed"
                    ? "已结束"
                    : "草稿"}{" "}
                ，可见性：{project.visibility === "Public" ? "公开" : "保密"}
              </Text>
            </Flex>
            <Flex gap={2}>
              {canEdit && (
                <Button
                  as={NextLink}
                  href={`/projects/${project.id}/edit`}
                  leftIcon={<MdEdit />}
                >
                  编辑项目
                </Button>
              )}
              {project.status === "Open" && (
                <Button
                  colorScheme="brand"
                  onClick={() => {
                    window.open(
                      "https://jinshuju.net/f/fake_form_id",
                      "_blank",
                    );
                  }}
                >
                  申请加入
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
        style={{
          maxWidth: "100%",
        }}
      />
    </Flex>
  );
}
