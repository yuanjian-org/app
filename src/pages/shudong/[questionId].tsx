import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Button,
  Flex,
  Heading,
  VStack,
  Text,
  Textarea,
  FormControl,
  FormLabel,
  Switch,
  Divider,
} from "@chakra-ui/react";
import trpc, { trpcNext } from "trpc";
import useMe from "useMe";
import { canAccessShudong } from "shared/ShudongPermissions";
import TopBar, { topBarPaddings } from "components/TopBar";
import PageBreadcrumb from "components/PageBreadcrumb";
import { fullPage } from "AppPage";
import { componentSpacing, pageMarginX } from "theme/metrics";
import Loader from "components/Loader";
import T from "components/T";
import { ShudongPostItem } from "components/ShudongPostItem";
import { toast } from "react-toastify";

export default fullPage(() => {
  const router = useRouter();
  const questionId =
    typeof router.query.questionId === "string" ? router.query.questionId : "";

  const me = useMe();
  const hasAccess = canAccessShudong(me);

  const { data, isLoading, refetch } = trpcNext.shudong.getQuestion.useQuery(
    { questionId },
    { enabled: hasAccess && !!questionId },
  );

  const [responseMarkdown, setResponseMarkdown] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (questionId) {
      void trpc.shudong.getDraft
        .query({ shudongParentId: questionId })
        .then((draft) => {
          if (draft) setResponseMarkdown(draft);
        });
    }
  }, [questionId]);

  useEffect(() => {
    if (questionId) {
      const timer = setTimeout(() => {
        void trpc.shudong.saveDraft.mutate({
          shudongParentId: questionId,
          markdown: responseMarkdown,
        });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [responseMarkdown, questionId]);

  const handleCreateResponse = async () => {
    if (!responseMarkdown.trim()) {
      toast.error("回答内容不能为空");
      return;
    }
    setIsSubmitting(true);
    try {
      await trpc.shudong.createPost.mutate({
        parentId: questionId,
        markdown: responseMarkdown,
        isAnonymous,
      });
      toast.success("回答成功");
      setResponseMarkdown("");
      void refetch();
    } catch (err: any) {
      toast.error(err.message || "回答失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasAccess) {
    return (
      <Box p={8}>
        <Text color="gray.500">
          <T>暂无权限访问树洞。</T>
        </Text>
      </Box>
    );
  }

  if (isLoading || !data) {
    return <Loader />;
  }

  const { question, responses } = data;

  return (
    <>
      <TopBar {...topBarPaddings()}>
        <VStack spacing={componentSpacing} align="stretch">
          <PageBreadcrumb
            current="问题详情"
            parents={[{ name: "树洞", link: "/shudong" }]}
          />
        </VStack>
      </TopBar>

      <Box mx={pageMarginX} mt={pageMarginX}>
        <VStack spacing={6} align="stretch">
          <ShudongPostItem post={question} onRefetch={refetch} isRootQuestion />

          <Divider />

          <Box
            p={4}
            borderWidth="1px"
            borderRadius="md"
            bg="white"
            boxShadow="sm"
          >
            <Heading size="md" mb={3}>
              <T>撰写回答</T>
            </Heading>
            <VStack spacing={3} align="stretch">
              <Textarea
                placeholder="写下你的回答..."
                value={responseMarkdown}
                onChange={(e) => setResponseMarkdown(e.target.value)}
                rows={4}
              />
              <Flex justify="space-between" align="center">
                <FormControl display="flex" alignItems="center" w="auto">
                  <FormLabel htmlFor="resp-anon-switch" mb="0" fontSize="sm">
                    <T>匿名回答</T>
                  </FormLabel>
                  <Switch
                    id="resp-anon-switch"
                    isChecked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                </FormControl>

                <Button
                  colorScheme="brand"
                  onClick={() => {
                    void handleCreateResponse();
                  }}
                  isLoading={isSubmitting}
                >
                  <T>发表回答</T>
                </Button>
              </Flex>
            </VStack>
          </Box>

          <Heading size="md" mt={2}>
            {responses.length} <T>条回答</T>
          </Heading>

          {responses.length === 0 ? (
            <Text color="gray.500">
              <T>暂无回答，抢沙发吧！</T>
            </Text>
          ) : (
            <VStack spacing={4} align="stretch">
              {responses.map((resp) => (
                <ShudongPostItem
                  key={resp.id}
                  post={resp}
                  onRefetch={refetch}
                />
              ))}
            </VStack>
          )}
        </VStack>
      </Box>
    </>
  );
}, "树洞问题详情");
