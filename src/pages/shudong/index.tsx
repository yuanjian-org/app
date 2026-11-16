import { Fragment, useState, useEffect } from "react";
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
  MenuDivider,
  Portal,
  Link,
  Icon,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { MdAdd, MdNotifications, MdNotificationsNone } from "react-icons/md";
import trpc, { trpcNext } from "trpc";
import useMe from "useMe";
import useMobile from "useMobile";
import { cmdOrCtrlChar } from "macOrWin";
import { isPermitted } from "shared/Role";
import { canAccessShudong } from "shared/ShudongPermissions";
import {
  ShudongNotificationFrequency,
  ShudongSubscribeAll,
} from "shared/UserPreference";
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
import MarkdownSupport from "components/MarkdownSupport";

type EffectiveSubscribeChoice = Exclude<ShudongSubscribeAll, "default">;

const subscribeChoiceLabels: Record<EffectiveSubscribeChoice, string> = {
  yes: "新问题",
  yesWithResponses: "新问题并自动订阅",
  no: "仅已订阅",
};

/**
 * Returns the dot-separated label segments shown in the header notification
 * button. Shortens "新问题并自动订阅 · 每日汇总" to "新问题 · 订阅 · 汇总" so
 * the header stays compact without changing the dropdown menu text.
 */
function getNotificationSummaryParts(
  choice: EffectiveSubscribeChoice,
  isDailyDigest: boolean,
): string[] {
  if (!isDailyDigest) {
    return [subscribeChoiceLabels[choice]];
  }
  switch (choice) {
    case "yes":
      return ["新问题", "汇总"];
    case "yesWithResponses":
      return ["新问题", "订阅", "汇总"];
    case "no":
      return ["仅已订阅", "汇总"];
  }
}

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

  const notificationFrequency =
    pref?.shudongNotificationFrequency ?? "immediate";
  const isDailyDigest = notificationFrequency === "daily";
  const isNewQuestionNotifOff = effectiveSubscribeChoice === "no";
  const notificationIcon = isNewQuestionNotifOff
    ? MdNotificationsNone
    : MdNotifications;

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
        ? "通知设置已更新，将自动订阅后续新问题"
        : "通知设置已更新",
    );
    void refetchPref();
  };

  const handleFrequencyChange = async (val: ShudongNotificationFrequency) => {
    await trpc.users.setUserPreference.mutate({
      userId: me.id,
      preference: {
        ...(pref ?? {}),
        shudongNotificationFrequency: val,
      },
    });
    toast.success(
      val === "daily"
        ? "已切换为每日汇总，将于每天 20:00 汇总发送树洞通知"
        : "已切换为即时通知",
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
      <TopBar
        {...topBarPaddings()}
        ps={0}
        pe={0}
        pb={{ base: 4, [breakpoint]: 5 }}
        bg="rgba(255, 255, 255, 0.92)"
        backdropFilter="blur(8px)"
        shadow="0 1px 2px rgba(0, 0, 0, 0.04)"
      >
        {/* Header, notification menu, and action button share a single row.
            Boxed to appPageMaxWidth so the 提问 button aligns flush with
            posts. */}
        <Flex
          justify="space-between"
          align="center"
          gap={{ base: 2, md: 3 }}
          minH={{ base: "40px", [breakpoint]: "auto" }}
          ps={pageMarginX}
          pe={{
            base: mobileSidbarIconLeftWithMargin,
            [breakpoint]: pageMarginX[breakpoint],
          }}
          maxW={{ base: "100%", xl: appPageMaxWidth }}
        >
          <HStack spacing={{ base: 2.5, md: 4 }} align="center" minW={0}>
            <PageBreadcrumb current="树洞" marginBottom={0} flexShrink={0} />
            <Menu isLazy>
              <MenuButton
                px={{ base: 2.5, md: 3.5 }}
                h={{ base: "34px", md: "36px" }}
                borderRadius="full"
                borderWidth="1px"
                borderColor="gray.200"
                bg="gray.50"
                fontSize={{ base: "xs", md: "sm" }}
                fontWeight="medium"
                color="gray.700"
                minW={0}
                maxW="100%"
                transition="background-color 0.15s, border-color 0.15s"
                _hover={{ bg: "gray.100", borderColor: "gray.300" }}
                _expanded={{ bg: "gray.100", borderColor: "gray.300" }}
                sx={{
                  "& > span": {
                    display: "flex",
                    alignItems: "center",
                    minW: 0,
                  },
                }}
              >
                <HStack spacing={1.5} align="center" minW={0}>
                  <Icon
                    as={notificationIcon}
                    boxSize={4}
                    color={isNewQuestionNotifOff ? "gray.500" : "brand.500"}
                    flexShrink={0}
                  />
                  <Text as="span" isTruncated>
                    <Box as="span" display={{ base: "none", md: "inline" }}>
                      <T>接收通知：</T>
                    </Box>
                    {getNotificationSummaryParts(
                      effectiveSubscribeChoice,
                      isDailyDigest,
                    ).map((part, idx) => (
                      <Fragment key={idx}>
                        {idx > 0 && " · "}
                        <T>{part}</T>
                      </Fragment>
                    ))}
                  </Text>
                  <ChevronDownIcon
                    boxSize={4}
                    color="gray.500"
                    flexShrink={0}
                  />
                </HStack>
              </MenuButton>
              <Portal>
                <MenuList
                  minW="240px"
                  maxW="calc(100vw - 32px)"
                  shadow="lg"
                  borderColor="gray.200"
                >
                  <MenuOptionGroup
                    title="新问题通知"
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
                      <T>新问题</T>
                    </MenuItemOption>
                    <MenuItemOption
                      value="yesWithResponses"
                      alignItems="baseline"
                      whiteSpace="normal"
                    >
                      <Text as="span" display="block">
                        <T>新问题并自动订阅</T>
                      </Text>
                      <Text
                        as="span"
                        display="block"
                        fontSize="xs"
                        color="gray.500"
                      >
                        <T>自动订阅后续新问题以接收回复，可单独取消</T>
                      </Text>
                    </MenuItemOption>
                    <MenuItemOption
                      value="no"
                      alignItems="baseline"
                      whiteSpace="normal"
                    >
                      <T>关</T>
                    </MenuItemOption>
                  </MenuOptionGroup>
                  <MenuDivider />
                  <MenuOptionGroup
                    title="新问题和新回复的通知频率"
                    type="radio"
                    value={notificationFrequency}
                    onChange={(val) => {
                      if (val === "immediate" || val === "daily") {
                        void handleFrequencyChange(val);
                      }
                    }}
                  >
                    <MenuItemOption value="immediate">
                      <T>即时通知</T>
                    </MenuItemOption>
                    <MenuItemOption
                      value="daily"
                      alignItems="baseline"
                      whiteSpace="normal"
                    >
                      <Text as="span" display="block">
                        <T>每日汇总</T>
                      </Text>
                      <Text
                        as="span"
                        display="block"
                        fontSize="xs"
                        color="gray.500"
                      >
                        <T>北京时间晚八点发出</T>
                      </Text>
                    </MenuItemOption>
                  </MenuOptionGroup>
                </MenuList>
              </Portal>
            </Menu>
          </HStack>
          <Button
            colorScheme="brand"
            h={{ base: "40px", [breakpoint]: "38px" }}
            px={{ base: 3, md: 4 }}
            fontSize="sm"
            borderRadius={{ base: "md", [breakpoint]: "lg" }}
            boxShadow="sm"
            flexShrink={0}
            iconSpacing={1.5}
            leftIcon={<Icon as={MdAdd} boxSize={4} />}
            onClick={onOpen}
          >
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
              <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                <FormControl display="flex" alignItems="center" w="auto">
                  <FormLabel htmlFor="anon-switch" mb="0">
                    <T>匿名提问</T>
                  </FormLabel>
                  <Switch
                    id="anon-switch"
                    isChecked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                </FormControl>
                <MarkdownSupport fontSize="sm" />
              </Flex>
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
