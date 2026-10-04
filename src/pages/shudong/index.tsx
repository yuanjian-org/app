import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Flex,
  VStack,
  Text,
  Textarea,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  FormControl,
  FormLabel,
  Switch,
  Select,
  Link,
  Icon,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { MdAdd, MdNotifications } from "react-icons/md";
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
 * Main Shudong feed page displaying top-level questions.
 * Enforces permission checks and allows users to draft and submit questions.
 */
export default fullPage(() => {
  const me = useMe();
  const isMobile = useMobile();
  const hasAccess = canAccessShudong(me);

  const { data: pref, refetch: refetchPref } =
    trpcNext.users.getUserPreference.useQuery(
      { userId: me.id },
      { enabled: hasAccess && !!me.id },
    );

  // Enabled condition prevents unauthorized users from fetching question feeds
  const {
    data: questions,
    isLoading,
    refetch,
  } = trpcNext.shudong.listQuestions.useQuery({}, { enabled: hasAccess });

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [questionMarkdown, setQuestionMarkdown] = useState("");
  // Questions default to anonymous (true) to lower inhibition for asking
  // questions
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load unsaved draft for top-level questions when opening modal
  useEffect(() => {
    if (isOpen) {
      void trpc.shudong.getDraft
        .query({ shudongParentId: "root", shudongPostId: null })
        .then((draft) => {
          if (draft) setQuestionMarkdown(draft);
        });
    }
  }, [isOpen]);

  const subscribeAllChoice = pref?.shudongSubscribeAll ?? "default";

  const handleSubscribeAllChange = async (val: "yes" | "no" | "default") => {
    await trpc.users.setUserPreference.mutate({
      userId: me.id,
      preference: {
        ...(pref ?? {}),
        shudongSubscribeAll: val,
      },
    });
    toast.success("新问题通知设置已更新");
    void refetchPref();
  };

  const handleCreateQuestion = async () => {
    if (!questionMarkdown.trim()) {
      toast.error("问题内容不能为空");
      return;
    }
    setIsSubmitting(true);
    try {
      await trpc.shudong.createPost.mutate({
        parentId: null,
        markdown: questionMarkdown,
        isAnonymous,
      });
      toast.success("提问成功");
      setQuestionMarkdown("");
      onClose();
      void refetch();
    } catch (err: any) {
      toast.error(err.message || "提问失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deny render if user lacks Shudong permissions
  if (!hasAccess) {
    return (
      <Box p={8}>
        <Text color="gray.500">
          <T>暂无权限访问树洞。</T>
        </Text>
      </Box>
    );
  }

  return (
    <>
      <TopBar {...topBarPaddings()}>
        {/* Title and feature explanation share a VStack next to action button.
            On mobile, the button is placed vertically below the VStack. */}
        <Flex
          direction={isMobile ? "column" : "row"}
          justify="space-between"
          align={isMobile ? "start" : "center"}
          gap={isMobile ? 3 : 12}
        >
          <VStack align="start" spacing={1}>
            <PageBreadcrumb current="树洞" marginBottom={0} />
            {/* The notification controls are inlined after the welcome text
                so that the whole thing is a single responsive line that
                wraps as needed and shares one font style. */}
            <Text fontSize="sm" color="gray.600">
              <T>欢迎来到树洞！在这里你可以匿名或实名提问、交流与解答问题。</T>{" "}
              {/* Solid bell icon, vertically aligned with the inline text */}
              <Icon
                as={MdNotifications}
                boxSize={5}
                // "middle" matches the Select below and centers the icon
                // against the text line.
                verticalAlign="middle"
                // Nudge up by 2px without affecting line layout.
                position="relative"
                top="-2px"
                mr={1}
              />
              <T>接收未来新问题通知：</T>
              <Select
                size="xs"
                // Layout props apply to Select's wrapper element. Keep it
                // inline so it flows with (and wraps like) the text.
                display="inline-block"
                w="auto"
                verticalAlign="middle"
                mx={1}
                value={subscribeAllChoice}
                onChange={(e) =>
                  void handleSubscribeAllChange(
                    e.target.value as "yes" | "no" | "default",
                  )
                }
              >
                <option value="default">默认</option>
                <option value="yes">是</option>
                <option value="no">否</option>
              </Select>
              <T>（导师默认是，其他用户默认否）</T>
            </Text>
          </VStack>
          <Button colorScheme="brand" leftIcon={<MdAdd />} onClick={onOpen}>
            <T>提问</T>
          </Button>
        </Flex>
      </TopBar>

      <Box mx={pageMarginX} mt={pageMarginX}>
        {isLoading ? (
          <Loader />
        ) : !questions || questions.length === 0 ? (
          <Text color="gray.500">
            <T>暂无树洞问题，快去提问吧！</T>
          </Text>
        ) : (
          <VStack spacing={4} align="stretch">
            {questions.map((question) => (
              <Box key={question.id} position="relative">
                <NextLink
                  href={`/shudong/${question.id}`}
                  passHref
                  legacyBehavior
                >
                  {/* color="inherit" prevents default blue link styling on
                      cards */}
                  <Link
                    color="inherit"
                    _hover={{ textDecoration: "none" }}
                    display="block"
                  >
                    <ShudongPostItem
                      post={question}
                      onRefetch={refetch}
                      isRootQuestion
                      hideEditDelete
                      isHomePage
                    />
                  </Link>
                </NextLink>
              </Box>
            ))}
          </VStack>
        )}
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <T>发表提问</T>
          </ModalHeader>
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {isOpen && (
                <Autosaver
                  data={questionMarkdown}
                  onSave={async (draft) => {
                    await trpc.shudong.saveDraft.mutate({
                      shudongParentId: "root",
                      shudongPostId: null,
                      markdown: draft,
                    });
                  }}
                />
              )}
              <Textarea
                placeholder={
                  "请写下你的问题" +
                  (!isMobile ? ` (${cmdOrCtrlChar()} + Enter 发送)` : "")
                }
                value={questionMarkdown}
                onChange={(e) => setQuestionMarkdown(e.target.value)}
                onKeyDown={(e) => {
                  // Keyboard shortcut for fast submission on desktop
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    void handleCreateQuestion();
                  }
                }}
                rows={5}
              />
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="anon-switch" mb="0">
                  <T>匿名提问</T>
                </FormLabel>
                <Switch
                  id="anon-switch"
                  isChecked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose}>
              <T>取消</T>
            </Button>
            <Button
              colorScheme="brand"
              onClick={() => {
                void handleCreateQuestion();
              }}
              isLoading={isSubmitting}
            >
              <T>提交</T>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}, "树洞");
