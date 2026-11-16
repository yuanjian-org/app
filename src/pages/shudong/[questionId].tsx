import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  VStack,
  Text,
  Textarea,
  FormControl,
  FormLabel,
  Switch,
  Divider,
} from "@chakra-ui/react";
import { FiCheck, FiShare2 } from "react-icons/fi";
import trpc, { trpcNext } from "trpc";
import useMe from "useMe";
import useMobile from "useMobile";
import { cmdOrCtrlChar } from "macOrWin";
import { canAccessShudong } from "shared/ShudongPermissions";
import { mobileSidbarIconLeftWithMargin } from "components/Navbars";
import PageBreadcrumb from "components/PageBreadcrumb";
import { breakpoint } from "theme/breakpoints";
import { pageMarginX } from "theme/metrics";
import Loader from "components/Loader";
import T from "components/T";
import { ShudongPostItem } from "components/ShudongPostItem";
import { ShudongEmojiBar } from "components/ShudongEmojiBar";
import { toast } from "react-toastify";
import Autosaver from "components/Autosaver";
import MarkdownSupport from "components/MarkdownSupport";

/**
 * Question detail page displaying the root question, existing response tree,
 * and a response input panel placed at the bottom.
 */
export default function Page() {
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
  const [hasCopied, setHasCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleShare = () => {
    if (!navigator.clipboard) {
      return;
    }
    void navigator.clipboard.writeText(window.location.href);
    toast.success("已复制链接到剪贴板");
    setHasCopied(true);
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => setHasCopied(false), 2000);
  };

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
      <Text color="gray.500">
        <T>暂无权限访问树洞。</T>
      </Text>
    );
  }

  const mobileEndPadding = [
    mobileSidbarIconLeftWithMargin,
    pageMarginX.base,
  ].join(" - ");

  return (
    <>
      {/* Align header vertically with the fixed mobile menu button and keep
          right clearance below the breakpoint while staying flush with post
          cards on desktop. */}
      <Flex
        justify="space-between"
        align="center"
        wrap="wrap"
        gap={2}
        mt={{ base: "-9px", [breakpoint]: 0 }}
        minH={{ base: "40px", [breakpoint]: "auto" }}
        pe={{ base: `calc(${mobileEndPadding})`, [breakpoint]: 0 }}
        mb={{ base: 4, [breakpoint]: 6 }}
      >
        <PageBreadcrumb
          showBackArrow
          current="问题详情"
          parents={[{ name: "树洞", link: "/shudong" }]}
          marginBottom={0}
        />

        <Button
          size="sm"
          variant="outline"
          h={{ base: "34px", [breakpoint]: "36px" }}
          px={{ base: 2.5, md: 3 }}
          borderRadius="full"
          borderColor={hasCopied ? "green.300" : "gray.200"}
          bg={hasCopied ? "green.50" : "white"}
          color={hasCopied ? "green.600" : "gray.700"}
          fontWeight="medium"
          flexShrink={0}
          leftIcon={<Icon as={hasCopied ? FiCheck : FiShare2} boxSize={3.5} />}
          _hover={{ bg: hasCopied ? "green.50" : "gray.100" }}
          onClick={handleShare}
        >
          {hasCopied ? <T>已复制</T> : <T>分享</T>}
        </Button>
      </Flex>

      {isLoading || !data ? (
        <Loader />
      ) : (
        <VStack spacing={6} align="stretch">
          {/* Root question display */}
          <ShudongPostItem
            post={data.question}
            onRefetch={refetch}
            isRootQuestion
            onDeleteSuccess={() => void router.push("/shudong")}
          />

          <Heading size="md" mt={2}>
            {data.responses.length} <T>条回答</T>
          </Heading>

          {/* List of top-level responses */}
          {data.responses.length === 0 ? (
            <Text color="gray.500">
              <T>暂无回答，抢沙发吧！</T>
            </Text>
          ) : (
            <VStack spacing={4} align="stretch">
              {data.responses.map((resp) => (
                <ShudongPostItem
                  key={resp.id}
                  post={resp}
                  onRefetch={refetch}
                />
              ))}
            </VStack>
          )}

          {/* Divider rendered only when responses exist to avoid visual
              clutter */}
          {data.responses.length > 0 && <Divider />}

          {/* Response creation panel positioned at the bottom of thread */}
          <Box
            px={{ base: 4, md: 5 }}
            py={4}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="lg"
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
            <VStack spacing={2.5} align="stretch">
              <VStack spacing={1.5} align="stretch">
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
                <Flex
                  justify="space-between"
                  align="center"
                  wrap="wrap"
                  gap={2}
                >
                  <ShudongEmojiBar
                    value={responseMarkdown}
                    onChange={setResponseMarkdown}
                    textareaRef={responseInputRef}
                  />
                  <MarkdownSupport fontSize="sm" />
                </Flex>
              </VStack>
              <Flex justify="space-between" align="center">
                <FormControl display="flex" alignItems="center" w="auto">
                  <FormLabel htmlFor="resp-anon-switch" mb="0" fontSize="sm">
                    <T>匿名回答</T>
                  </FormLabel>
                  <Switch
                    id="resp-anon-switch"
                    size="sm"
                    isChecked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                </FormControl>

                <Button
                  size="sm"
                  colorScheme="brand"
                  onClick={() => {
                    void handleCreateResponse();
                  }}
                  isLoading={isSubmitting}
                >
                  <T>发表</T>
                </Button>
              </Flex>
            </VStack>
          </Box>
        </VStack>
      )}
    </>
  );
}

Page.title = "树洞问题详情";
