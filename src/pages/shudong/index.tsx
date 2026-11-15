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
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuOptionGroup,
  MenuItemOption,
  Link,
  Icon,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { MdAdd, MdNotifications } from "react-icons/md";
import trpc, { trpcNext } from "trpc";
import useMe from "useMe";
import useMobile from "useMobile";
import { cmdOrCtrlChar } from "macOrWin";
import { isPermitted } from "shared/Role";
import { canAccessShudong } from "shared/ShudongPermissions";
import { ShudongSubscribeAll } from "shared/UserPreference";
import TopBar, { topBarPaddings } from "components/TopBar";
import { mobileSidbarIconLeftWithMargin } from "components/Navbars";
import PageBreadcrumb from "components/PageBreadcrumb";
import { fullPage } from "AppPage";
import { breakpoint } from "theme/breakpoints";
import { appPageMaxWidth, pageMarginX } from "theme/metrics";
import Loader from "components/Loader";
import T from "components/T";
import { ShudongPostItem } from "components/ShudongPostItem";
import { toast } from "react-toastify";
import Autosaver from "components/Autosaver";

type EffectiveSubscribeChoice = Exclude<ShudongSubscribeAll, "default">;

const subscribeChoiceLabels: Record<EffectiveSubscribeChoice, string> = {
  yes: "仅新问题",
  yesWithResponses: "新问题及所有回复",
  no: "关",
};

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
  // When the preference is "default" (or unset), mentors receive notifications
  // for new questions by default while other users do not.
  const effectiveSubscribeChoice: EffectiveSubscribeChoice =
    subscribeAllChoice === "default"
      ? isPermitted(me.roles, "Mentor")
        ? "yes"
        : "no"
      : subscribeAllChoice;

  const handleSubscribeAllChange = async (val: EffectiveSubscribeChoice) => {
    await trpc.users.setUserPreference.mutate({
      userId: me.id,
      preference: {
        ...(pref ?? {}),
        shudongSubscribeAll: val,
      },
    });
    toast.success(
      val === "yesWithResponses"
        ? "通知设置已更新，将自动订阅所有新问题的回复"
        : "通知设置已更新",
    );
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
      <TopBar {...topBarPaddings()} ps={0} pe={0}>
        {/* Header, notification menu, and action button share a single row
            and wrap only if the viewport is too narrow. Boxed to
            appPageMaxWidth so the 提问 button aligns flush with posts. */}
        <Flex
          justify="space-between"
          align="center"
          wrap="wrap"
          gap={3}
          ps={pageMarginX}
          pe={{
            base: mobileSidbarIconLeftWithMargin,
            [breakpoint]: pageMarginX[breakpoint],
          }}
          maxW={{ base: "100%", xl: appPageMaxWidth }}
        >
          <HStack spacing={4} align="center">
            <PageBreadcrumb current="树洞" marginBottom={0} />
            <Menu>
              <MenuButton fontSize="sm" color="gray.600">
                <HStack spacing={1} align="center">
                  <Icon as={MdNotifications} boxSize={5} />
                  <Text>
                    <T>接收通知：</T>
                    <T>{subscribeChoiceLabels[effectiveSubscribeChoice]}</T>
                  </Text>
                  <ChevronDownIcon boxSize={4} />
                </HStack>
              </MenuButton>
              <MenuList>
                <MenuOptionGroup
                  type="radio"
                  value={effectiveSubscribeChoice}
                  onChange={(val) => {
                    if (
                      val === "yes" ||
                      val === "yesWithResponses" ||
                      val === "no"
                    ) {
                      void handleSubscribeAllChange(val);
                    }
                  }}
                >
                  <MenuItemOption value="yes">
                    <T>仅新问题</T>
                  </MenuItemOption>
                  <MenuItemOption value="yesWithResponses">
                    <T>新问题及所有回复</T>
                  </MenuItemOption>
                  <MenuItemOption value="no">
                    <T>关</T>
                  </MenuItemOption>
                </MenuOptionGroup>
              </MenuList>
            </Menu>
          </HStack>
          <Button colorScheme="brand" leftIcon={<MdAdd />} onClick={onOpen}>
            <T>提问</T>
          </Button>
        </Flex>
      </TopBar>

      {/* Match post width to normal-width pages (AppPageContainer) */}
      <Box
        px={pageMarginX}
        mt={pageMarginX}
        maxW={{ base: "100%", xl: appPageMaxWidth }}
      >
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
