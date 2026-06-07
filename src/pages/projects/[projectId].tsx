import { useRouter } from "next/router";
import {
  VStack,
  Heading,
  Text,
  Box,
  Button,
  useToast,
  Textarea,
} from "@chakra-ui/react";
import PageBreadcrumb from "components/PageBreadcrumb";
import { trpcNext } from "../../trpc";
import { useState } from "react";
import MarkdownStyler from "components/MarkdownStyler";
import { useSession } from "next-auth/react";

export default function ProjectDetail() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const { data: session } = useSession();

  const {
    data: project,
    isLoading,
    error,
  } = trpcNext.projects.getProject.useQuery(
    { id: projectId },
    { enabled: !!projectId, retry: false },
  );

  const applyMutation = trpcNext.projects.applyProject.useMutation();
  const toast = useToast();
  const [content, setContent] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  if (isLoading) return <Text>加载中...</Text>;

  if (error) {
    if (error.message.includes("requires login")) {
      return (
        <VStack spacing={4} align="center" mt={10}>
          <Text>此项目需要登录后才能查看详细信息。</Text>
          <Button onClick={() => router.push("/auth/login")}>去登录</Button>
        </VStack>
      );
    }
    return <Text>发生错误: {error.message}</Text>;
  }

  if (!project) return <Text>未找到项目</Text>;

  const handleApply = () => {
    if (!session) {
      toast({ title: "请先登录", status: "warning" });
      void router.push("/auth/login");
      return;
    }
    if (!content.trim()) {
      toast({ title: "申请内容不能为空", status: "warning" });
      return;
    }
    try {
      void applyMutation.mutateAsync({ projectId, content }).then(() => {
        toast({ title: "申请提交成功", status: "success" });
        setIsApplying(false);
        setContent("");
      });
    } catch (e: any) {
      toast({ title: "申请失败", description: e.message, status: "error" });
    }
  };

  return (
    <>
      <PageBreadcrumb
        current={project.title}
        parents={[{ name: "挑战性问题发布平台", link: "/projects" }]}
      />
      <VStack align="stretch" spacing={6} mt={6}>
        <Heading>{project.title}</Heading>
        <Text color="gray.600">导师: {project.creator?.name}</Text>

        <Box>
          <Heading size="md" mb={2}>
            Background
          </Heading>
          <Text>{project.background}</Text>
        </Box>

        <Box>
          <Heading size="md" mb={2}>
            Challenge Description
          </Heading>
          <MarkdownStyler content={project.description} />
        </Box>

        {project.videoUrl && (
          <Box>
            <Heading size="md" mb={2}>
              Video
            </Heading>
            <a href={project.videoUrl} target="_blank" rel="noreferrer">
              观看导师详细视频讲解
            </a>
          </Box>
        )}

        <Box>
          <Heading size="md" mb={2}>
            学生画像要求
          </Heading>
          <Text>{project.studentPersona}</Text>
        </Box>

        {isApplying ? (
          <Box mt={4}>
            <Heading size="sm" mb={2}>
              提交申请方案
            </Heading>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请输入你的申请方案..."
              rows={6}
            />
            <Button
              mt={2}
              colorScheme="blue"
              onClick={handleApply}
              isLoading={applyMutation.isLoading}
            >
              提交
            </Button>
            <Button mt={2} ml={2} onClick={() => setIsApplying(false)}>
              取消
            </Button>
          </Box>
        ) : (
          <Button
            colorScheme="blue"
            onClick={() => setIsApplying(true)}
            maxW="200px"
          >
            我要报名
          </Button>
        )}
      </VStack>
    </>
  );
}

ProjectDetail.title = "项目详情";
