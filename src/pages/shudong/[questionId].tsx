import React, { useState, useEffect, useRef } from "react";
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
import { FiShare2 } from "react-icons/fi";
import trpc, { trpcNext } from "trpc";
import useMe from "useMe";
import useMobile from "useMobile";
import { cmdOrCtrlChar } from "macOrWin";
import { canAccessShudong } from "shared/ShudongPermissions";
import TopBar, { topBarPaddings } from "components/TopBar";
import PageBreadcrumb from "components/PageBreadcrumb";
import { fullPage } from "AppPage";
import { pageMarginX } from "theme/metrics";
import Loader from "components/Loader";
import T from "components/T";
import { ShudongPostItem } from "components/ShudongPostItem";
import { toast } from "react-toastify";
import Autosaver from "components/Autosaver";

/**
 * Question detail page displaying the root question, existing response tree,
 * and a response input panel placed at the bottom.
 */
export default fullPage(() => {
  const router = useRouter();
  const isMobile = useMobile();
  const questionId =
    typeof router.query.questionId === "string" ? router.query.questionId : "";

  const me = useMe();
  const responseInputRef = useRef<HTMLTextAreaElement>(null);
  const hasAccess = canAccessShudong(me);

  const { data, isLoading, refetch } = trpcNext.shudong.getQuestion.useQuery(
    { questionId },
    { enabled: hasAccess && !!questionId },
  );

  const [responseMarkdown, setResponseMarkdown] = useState("");
  // Responders are non-anonymous (false) by default
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Restore unsaved response draft specific to this question ID
  useEffect(() => {
    if (questionId) {
      void trpc.shudong.getDraft
        .query({ shudongParentId: questionId, shudongPostId: null })
        .then((draft) => {
          if (draft) setResponseMarkdown(draft);
        });
    }
  }, [questionId]);

  // Focus and scroll to response box if arriving from home page "回复" click
  useEffect(() => {
    if (router.query.focus === "reply" && !isLoading && data) {
      const timer = setTimeout(() => {
        responseInputRef.current?.focus();
        responseInputRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [router.query.focus, isLoading, data]);

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
        {/* Share button placed right after the breadcrumb with spacing */}
        <Flex align="center" justify="flex-start" gap={6}>
          <PageBreadcrumb
            current="问题详情"
            parents={[{ name: "树洞", link: "/shudong" }]}
            marginBottom={0}
          />
          <Button
            leftIcon={<FiShare2 />}
            size="sm"
            variant="outline"
            colorScheme="brand"
            flexShrink={0}
            onClick={() => {
              if (navigator.clipboard) {
                void navigator.clipboard.writeText(window.location.href);
                toast.success("已复制链接到剪贴板");
              }
            }}
          >
            <T>分享</T>
          </Button>
        </Flex>
      </TopBar>

      <Box mx={pageMarginX} mt={pageMarginX}>
        <VStack spacing={6} align="stretch">
          {/* Root question display */}
          <ShudongPostItem
            post={question}
            onRefetch={refetch}
            isRootQuestion
            onDeleteSuccess={() => void router.push("/shudong")}
          />

          <Heading size="md" mt={2}>
            {responses.length} <T>条回答</T>
          </Heading>

          {/* List of top-level responses */}
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

          {/* Divider rendered only when responses exist to avoid visual clutter */}
          {responses.length > 0 && <Divider />}

          {/* Response creation panel positioned at the bottom of thread */}
          <Box
            p={4}
            borderWidth="1px"
            borderRadius="md"
            bg="white"
            boxShadow="sm"
          >
            <Autosaver
              data={responseMarkdown}
              onSave={async (draft) => {
                await trpc.shudong.saveDraft.mutate({
                  shudongParentId: questionId,
                  shudongPostId: null,
                  markdown: draft,
                });
              }}
            />
            <Heading size="md" mb={3}>
              <T>写下你的回答</T>
            </Heading>
            <VStack spacing={3} align="stretch">
              <Textarea
                ref={responseInputRef}
                placeholder={
                  !isMobile ? `(${cmdOrCtrlChar()} + Enter 发送)` : ""
                }
                value={responseMarkdown}
                onChange={(e) => setResponseMarkdown(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    void handleCreateResponse();
                  }
                }}
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
        </VStack>
      </Box>
    </>
  );
}, "树洞问题详情");
