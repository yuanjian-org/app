import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Avatar,
  Button,
  Textarea,
  Badge,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Switch,
  FormControl,
  FormLabel,
  Icon,
  Tooltip,
  Link,
} from "@chakra-ui/react";
import { PiStarFourFill } from "react-icons/pi";
import { FaBell, FaRegBell } from "react-icons/fa";
import {
  ChatIcon,
  EditIcon,
  DeleteIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronRightIcon,
} from "@chakra-ui/icons";
import trpc, { trpcNext } from "trpc";
import { ShudongEmoji, ShudongPost } from "shared/Shudong";
import { getUserUrl } from "shared/User";
import { canEditOrDeleteShudongPost } from "shared/ShudongPermissions";
import useMe from "useMe";
import useMobile from "useMobile";
import { cmdOrCtrlChar } from "macOrWin";
import { prettifyDate } from "shared/strings/prettifyDate";
import { formatUserName } from "shared/strings/formatUserName";
import MarkdownStyler from "./MarkdownStyler";
import MarkdownSupport from "./MarkdownSupport";
import { toast } from "react-toastify";
import T from "components/T";
import { UserLink } from "./UserChip";
import Autosaver from "./Autosaver";
import {
  applyOptimisticReactionToggle,
  ShudongEmojiBar,
  ShudongEmojiPopover,
} from "./ShudongEmojiBar";
import styles from "./ShudongPostItem.module.css";

/**
 * Shared metadata header for Shudong questions and responses.
 * Reusing the exact same metadata component across all node types ensures
 * visual consistency and avoids duplicating author/status rendering.
 */
export function ShudongPostMetadata({ post }: { post: ShudongPost }) {
  // Soft-deleted or anonymous posts hide author details to protect identity
  const isAnon = !post.author;
  const anonDisplayName = post.anonymousName || "匿名";
  const authorName = post.author
    ? formatUserName(post.author.name)
    : anonDisplayName;

  return (
    <HStack spacing={3} alignItems="center">
      {/* Omit hardcoded bg/color so Avatar computes a distinct color */}
      {/* from the full display name via the global Avatar theme. */}
      <Avatar size="sm" boxSize={9} name={authorName} />
      <VStack spacing={0.5} align="start">
        <HStack spacing={2} align="center" wrap="wrap">
          {isAnon ? (
            <Text
              fontWeight="semibold"
              fontSize="sm"
              lineHeight="1.3"
              color="gray.600"
            >
              <T>{anonDisplayName}</T>
            </Text>
          ) : (
            <Text
              fontWeight="semibold"
              fontSize="sm"
              lineHeight="1.3"
              onClick={(e) => e.stopPropagation()}
            >
              <UserLink user={post.author!} />
            </Text>
          )}
          {/* Show mentor badge on non-deleted posts authored by a mentor. */}
          {/* For non-anonymous mentors, extend the badge into a profile link */}
          {/* so mentees can view the mentor's profile and book a chat. */}
          {!post.isDeleted &&
            post.isMentorPosted &&
            (post.author ? (
              <Link
                as={NextLink}
                href={getUserUrl(post.author)}
                isExternal
                onClick={(e) => e.stopPropagation()}
                _hover={{ textDecoration: "none" }}
                display="inline-flex"
              >
                <Badge
                  variant="subtle"
                  colorScheme="teal"
                  fontSize="xs"
                  fontWeight="medium"
                  textTransform="none"
                  px={2}
                  py="1px"
                  borderRadius="full"
                  borderWidth="1px"
                  borderColor="teal.200"
                  bg="teal.50"
                  color="teal.700"
                  display="inline-flex"
                  alignItems="center"
                  cursor="pointer"
                  transition="all 0.15s ease"
                  _hover={{ bg: "teal.100", borderColor: "teal.300" }}
                >
                  <T>导师</T>
                  <Text as="span" mx={1} color="teal.400" aria-hidden="true">
                    ·
                  </Text>
                  <T>预约交流</T>
                  <ChevronRightIcon boxSize={3.5} ml={0.5} mr={-0.5} />
                </Badge>
              </Link>
            ) : (
              <Badge
                variant="subtle"
                colorScheme="teal"
                fontSize="xs"
                fontWeight="medium"
                textTransform="none"
                px={2}
                py="1px"
                borderRadius="full"
                borderWidth="1px"
                borderColor="teal.200"
                bg="teal.50"
                color="teal.700"
              >
                <T>导师</T>
              </Badge>
            ))}
          {post.isAiGenerated && (
            <Tooltip label="AI 生成" hasArrow placement="top">
              <Box
                as="span"
                display="inline-flex"
                alignItems="center"
                color="gray.400"
                cursor="help"
                transition="color 0.15s ease"
                _hover={{ color: "gray.600" }}
              >
                <Icon as={PiStarFourFill} boxSize={3.5} aria-label="AI 生成" />
              </Box>
            </Tooltip>
          )}
          {/* Soft-deleted posts indicate deletion directly via content, */}
          {/* so no deleted label is shown. Edit badge is for active posts. */}
          {!post.isDeleted && post.lastEditedAt !== null && (
            <Badge
              variant="subtle"
              colorScheme="gray"
              fontSize="xs"
              fontWeight="normal"
              px={2}
              borderRadius="full"
              color="gray.600"
            >
              <T>已编辑</T>
            </Badge>
          )}
        </HStack>
        <Text fontSize="xs" color="gray.500" lineHeight="1.3">
          {prettifyDate(post.createdAt)}
        </Text>
      </VStack>
    </HStack>
  );
}

/**
 * Renders a single Shudong post (question, response, or sub-response) with
 * emoji reactions, subscription toggling, reply toggling,
 * draft auto-saving, inline editing, soft deletion, and expandable nested
 * child responses.
 */
export function ShudongPostItem({
  post,
  onRefetch,
  isRootQuestion = false,
  hideEditDelete = false,
  onDeleteSuccess,
  isHomePage = false,
}: {
  post: ShudongPost;
  onRefetch?: () => void;
  isRootQuestion?: boolean;
  hideEditDelete?: boolean;
  onDeleteSuccess?: () => void;
  isHomePage?: boolean;
}) {
  const me = useMe();
  const isMobile = useMobile();
  const router = useRouter();

  // Optimistic reactions state provides instant UI feedback before mutation
  // completes
  const [localReactions, setLocalReactions] = useState(post.reactions);

  useEffect(() => {
    setLocalReactions(post.reactions);
  }, [post.reactions]);

  const activeEmojiSet = new Set(
    localReactions.filter((r) => r.userHasReacted).map((r) => r.emoji),
  );

  // Optimistic subscription state
  const [localIsSubscribed, setLocalIsSubscribed] = useState(
    post.userIsSubscribed ?? false,
  );

  useEffect(() => {
    setLocalIsSubscribed(post.userIsSubscribed ?? false);
  }, [post.userIsSubscribed]);

  const [isReplying, setIsReplying] = useState(false);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const [replyMarkdown, setReplyMarkdown] = useState("");
  const [replyIsAnon, setReplyIsAnon] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const [editMarkdown, setEditMarkdown] = useState(post.markdown);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [showChildResponses, setShowChildResponses] = useState(false);

  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();

  // Fetches child responses lazily only when expanded to reduce initial
  // payload
  const { data: childResponses, refetch: refetchChildren } =
    trpcNext.shudong.getResponses.useQuery(
      { parentId: post.id },
      { enabled: showChildResponses },
    );

  // Toggle an emoji reaction optimistically to ensure snappy interactions
  const handleToggleReaction = useCallback(
    async (emoji: ShudongEmoji) => {
      const previous = localReactions;
      setLocalReactions((prev) => applyOptimisticReactionToggle(prev, emoji));
      try {
        const res = await trpc.shudong.toggleReaction.mutate({
          postId: post.id,
          emoji,
        });
        setLocalReactions(res.reactions);
      } catch {
        setLocalReactions(previous);
      }
    },
    [localReactions, post.id],
  );

  // Toggle subscription optimistically
  const handleToggleSubscription = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const nextState = !localIsSubscribed;
      setLocalIsSubscribed(nextState);
      try {
        const res = await trpc.shudong.toggleSubscription.mutate({
          questionId: post.id,
        });
        setLocalIsSubscribed(res.isSubscribed);
        // Clarify that subscribing notifies user of all responses under this
        // question.
        toast.success(
          res.isSubscribed
            ? "已订阅该问题，你将收到该问题下所有回复的通知"
            : "已取消订阅",
        );
      } catch {
        setLocalIsSubscribed(!nextState);
      }
    },
    [localIsSubscribed, post.id],
  );

  // Load existing reply draft when opening reply area to restore unsaved work
  useEffect(() => {
    if (isReplying) {
      void trpc.shudong.getDraft
        .query({ shudongParentId: post.id, shudongPostId: null })
        .then((draft) => {
          if (draft) setReplyMarkdown(draft);
        });
    }
  }, [isReplying, post.id]);

  // Load existing edit draft when entering edit mode
  useEffect(() => {
    if (isEditing) {
      void trpc.shudong.getDraft
        .query({ shudongParentId: null, shudongPostId: post.id })
        .then((draft) => {
          if (draft) setEditMarkdown(draft);
        });
    }
  }, [isEditing, post.id]);

  const handleCreateReply = async () => {
    if (!replyMarkdown.trim()) {
      toast.error("回复内容不能为空");
      return;
    }
    setIsSubmittingReply(true);
    try {
      await trpc.shudong.createPost.mutate({
        parentId: post.id,
        markdown: replyMarkdown,
        isAnonymous: replyIsAnon,
      });
      toast.success("回复成功");
      setReplyMarkdown("");
      setIsReplying(false);
      setShowChildResponses(true);
      if (refetchChildren) await refetchChildren();
      if (onRefetch) onRefetch();
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editMarkdown.trim()) {
      toast.error("内容不能为空");
      return;
    }
    setIsSubmittingEdit(true);
    try {
      await trpc.shudong.updatePost.mutate({
        postId: post.id,
        markdown: editMarkdown,
      });
      toast.success("修改成功");
      setIsEditing(false);
      if (onRefetch) onRefetch();
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Deleting root question navigates back to /shudong to prevent NOT_FOUND
  // errors
  const handleDelete = async () => {
    await trpc.shudong.deletePost.mutate({ postId: post.id });
    toast.success("已删除帖子");
    onDeleteClose();
    if (onDeleteSuccess) {
      onDeleteSuccess();
    } else if (isRootQuestion) {
      void router.push("/shudong");
    } else if (onRefetch) {
      onRefetch();
    }
  };

  // Edit/delete buttons are hidden on home page cards to maintain a clean feed
  const canEditOrDelete =
    !hideEditDelete && canEditOrDeleteShudongPost(me, post.author?.id ?? null);

  const isQuestionNode = post.parentId === null || isRootQuestion;
  const showReactionGroup = !post.isDeleted;
  const showSubscribeAction = !post.isDeleted && isQuestionNode;
  const showReplyAction = (isHomePage || !isRootQuestion) && !post.isDeleted;
  const showThreadToggle =
    (isHomePage || !isRootQuestion) && post.responseCount > 0;
  const hasActionGroup =
    showSubscribeAction || showReplyAction || showThreadToggle;
  const showFooter = showReactionGroup || hasActionGroup;

  return (
    <Box
      px={{ base: 4, md: 5 }}
      py={4}
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="lg"
      bg="white"
      boxShadow="sm"
      w="100%"
      transition="border-color 0.15s ease, box-shadow 0.15s ease"
      _hover={
        isHomePage
          ? {
              borderColor: "gray.300",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
            }
          : undefined
      }
    >
      <Flex justify="space-between" align="start" mb={2.5}>
        <ShudongPostMetadata post={post} />
        {canEditOrDelete && !post.isDeleted && (
          <HStack spacing={1}>
            <IconButton
              aria-label="编辑帖子"
              icon={<EditIcon />}
              size="xs"
              variant="ghost"
              onClick={() => {
                setEditMarkdown(post.markdown);
                setIsEditing(!isEditing);
              }}
            />
            <IconButton
              aria-label="删除帖子"
              icon={<DeleteIcon />}
              size="xs"
              variant="ghost"
              colorScheme="red"
              onClick={onDeleteOpen}
            />
          </HStack>
        )}
      </Flex>

      {isEditing ? (
        <VStack align="stretch" spacing={2} mb={3}>
          <Autosaver
            data={editMarkdown}
            onSave={async (draft) => {
              await trpc.shudong.saveDraft.mutate({
                shudongParentId: null,
                shudongPostId: post.id,
                markdown: draft,
              });
            }}
          />
          <Textarea
            ref={editInputRef}
            value={editMarkdown}
            onChange={(e) => setEditMarkdown(e.target.value)}
            onKeyDown={(e) => {
              // Cmd/Ctrl + Enter shortcut for fast saving on desktop
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void handleSaveEdit();
              }
            }}
            rows={3}
          />
          {!isQuestionNode && (
            <ShudongEmojiBar
              value={editMarkdown}
              onChange={setEditMarkdown}
              textareaRef={editInputRef}
            />
          )}
          <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
            <MarkdownSupport
              fontSize="sm"
              onClick={(e) => e.stopPropagation()}
            />
            <HStack spacing={2} ml="auto">
              <Button size="sm" onClick={() => setIsEditing(false)}>
                <T>取消</T>
              </Button>
              <Button
                size="sm"
                colorScheme="brand"
                onClick={() => {
                  void handleSaveEdit();
                }}
                isLoading={isSubmittingEdit}
              >
                <T>保存</T>
              </Button>
            </HStack>
          </Flex>
        </VStack>
      ) : (
        <Box
          className={styles.postBody}
          mb={showFooter ? 3 : 0}
          color="gray.800"
          lineHeight="1.7"
        >
          {post.isDeleted ? (
            <Text color="gray.400" fontStyle="italic">
              <T>【该内容已被删除】</T>
            </Text>
          ) : (
            <MarkdownStyler content={post.markdown} />
          )}
        </Box>
      )}

      {showFooter && (
        <Flex
          wrap="wrap"
          columnGap={2.5}
          rowGap={2}
          align="center"
          fontSize="sm"
          color="gray.600"
        >
          {showReactionGroup && (
            <Flex
              wrap="wrap"
              gap={1.5}
              align="center"
              onClick={(e) => {
                // Prevent card link wrapper on home page from intercepting
                // reaction clicks
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <ShudongEmojiPopover
                onSelect={(emoji) => void handleToggleReaction(emoji)}
                activeEmojis={activeEmojiSet}
                ariaLabel="添加表情回应"
                color="gray.500"
                variant="pill"
              />
              {localReactions.map((r) => (
                <HStack
                  key={r.emoji}
                  as="button"
                  type="button"
                  spacing={1}
                  h="26px"
                  px={2.5}
                  borderRadius="full"
                  borderWidth="1px"
                  bg={r.userHasReacted ? "blue.50" : "gray.50"}
                  borderColor={r.userHasReacted ? "blue.200" : "gray.200"}
                  color={r.userHasReacted ? "brand.600" : "gray.600"}
                  fontWeight={r.userHasReacted ? "semibold" : "normal"}
                  transition="all 0.15s ease"
                  _hover={{
                    bg: r.userHasReacted ? "blue.100" : "gray.100",
                    borderColor: r.userHasReacted ? "blue.300" : "gray.300",
                  }}
                  aria-label={`回应 ${r.emoji} ${r.count}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void handleToggleReaction(r.emoji);
                  }}
                >
                  <Text as="span" fontSize="sm" lineHeight="1">
                    {r.emoji}
                  </Text>
                  <Text
                    as="span"
                    fontSize="xs"
                    lineHeight="1"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {r.count}
                  </Text>
                </HStack>
              ))}
            </Flex>
          )}

          {showReactionGroup && hasActionGroup && (
            <Box h="14px" w="1px" bg="gray.200" aria-hidden="true" />
          )}

          {hasActionGroup && (
            <HStack spacing={1} align="center" wrap="wrap">
              {showSubscribeAction && (
                <Button
                  type="button"
                  size="xs"
                  h="26px"
                  px={2}
                  borderRadius="md"
                  fontSize="sm"
                  fontWeight="normal"
                  variant="ghost"
                  color="gray.600"
                  _hover={{ bg: "gray.100", color: "gray.800" }}
                  iconSpacing={1.5}
                  leftIcon={
                    <Icon
                      as={localIsSubscribed ? FaBell : FaRegBell}
                      boxSize={3.5}
                    />
                  }
                  aria-label={localIsSubscribed ? "取消订阅" : "订阅问题"}
                  onClick={(e) => void handleToggleSubscription(e)}
                >
                  <T>{localIsSubscribed ? "已订阅" : "订阅"}</T>
                </Button>
              )}

              {showReplyAction && (
                <Button
                  type="button"
                  size="xs"
                  h="26px"
                  px={2}
                  borderRadius="md"
                  fontSize="sm"
                  fontWeight="normal"
                  variant="ghost"
                  color="gray.600"
                  _hover={{ bg: "gray.100", color: "gray.800" }}
                  iconSpacing={1.5}
                  leftIcon={<ChatIcon boxSize={3.5} />}
                  aria-label="回复"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isHomePage) {
                      void router.push(`/shudong/${post.id}?focus=reply`);
                    } else {
                      setIsReplying((prev) => {
                        const next = !prev;
                        if (next) {
                          // Focus textarea immediately after expanding
                          setTimeout(() => replyInputRef.current?.focus(), 100);
                        }
                        return next;
                      });
                    }
                  }}
                >
                  <T>回复</T>
                </Button>
              )}

              {showThreadToggle && (
                <Button
                  type="button"
                  size="xs"
                  h="26px"
                  px={2}
                  borderRadius="md"
                  fontSize="sm"
                  fontWeight="medium"
                  variant="ghost"
                  color="gray.700"
                  _hover={{ bg: "gray.100", color: "gray.900" }}
                  iconSpacing={1}
                  rightIcon={
                    isHomePage ? (
                      <ChevronRightIcon boxSize={4} mr={-0.5} />
                    ) : showChildResponses ? (
                      <ChevronUpIcon boxSize={4} mr={-0.5} />
                    ) : (
                      <ChevronDownIcon boxSize={4} mr={-0.5} />
                    )
                  }
                  onClick={(e) => {
                    if (isHomePage) {
                      e.preventDefault();
                      e.stopPropagation();
                      void router.push(`/shudong/${post.id}`);
                    } else {
                      setShowChildResponses(!showChildResponses);
                    }
                  }}
                >
                  {showChildResponses
                    ? "收起回复"
                    : `${post.responseCount} 条回复`}
                </Button>
              )}
            </HStack>
          )}
        </Flex>
      )}

      {isReplying && (
        <VStack
          align="stretch"
          spacing={2.5}
          mt={3}
          p={3.5}
          bg="gray.50"
          borderRadius="md"
        >
          <Autosaver
            data={replyMarkdown}
            onSave={async (draft) => {
              await trpc.shudong.saveDraft.mutate({
                shudongParentId: post.id,
                shudongPostId: null,
                markdown: draft,
              });
            }}
          />
          <VStack spacing={1.5} align="stretch">
            <Textarea
              ref={replyInputRef}
              bg="white"
              placeholder={
                "写下你的回复" +
                (!isMobile ? ` (${cmdOrCtrlChar()} + Enter 发送)` : "")
              }
              value={replyMarkdown}
              onChange={(e) => setReplyMarkdown(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  void handleCreateReply();
                }
              }}
              rows={2}
            />
            <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
              <ShudongEmojiBar
                value={replyMarkdown}
                onChange={setReplyMarkdown}
                textareaRef={replyInputRef}
              />
              <MarkdownSupport
                fontSize="sm"
                onClick={(e) => e.stopPropagation()}
              />
            </Flex>
          </VStack>
          <Flex justify="space-between" align="center">
            <FormControl display="flex" alignItems="center" w="auto">
              <FormLabel
                htmlFor={`reply-anon-switch-${post.id}`}
                mb="0"
                fontSize="sm"
              >
                <T>匿名回复</T>
              </FormLabel>
              <Switch
                id={`reply-anon-switch-${post.id}`}
                size="sm"
                isChecked={replyIsAnon}
                onChange={(e) => setReplyIsAnon(e.target.checked)}
              />
            </FormControl>

            <HStack spacing={2}>
              <Button size="sm" onClick={() => setIsReplying(false)}>
                <T>取消</T>
              </Button>
              <Button
                size="sm"
                colorScheme="brand"
                onClick={() => {
                  void handleCreateReply();
                }}
                isLoading={isSubmittingReply}
              >
                <T>发表</T>
              </Button>
            </HStack>
          </Flex>
        </VStack>
      )}

      {/* Child response tree rendered with left border indentation */}
      {showChildResponses && (
        <VStack
          align="stretch"
          spacing={3}
          mt={4}
          pl={4}
          borderLeft="2px"
          borderColor="gray.100"
        >
          {childResponses && childResponses.length > 0 ? (
            childResponses.map((child) => (
              <ShudongPostItem
                key={child.id}
                post={child}
                onRefetch={() => {
                  void refetchChildren();
                  if (onRefetch) onRefetch();
                }}
              />
            ))
          ) : (
            <Text fontSize="xs" color="gray.400">
              <T>暂无回复</T>
            </Text>
          )}
        </VStack>
      )}

      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <T>确认删除</T>
          </ModalHeader>
          <ModalBody>
            <Text>
              <T>确定要删除这条帖子吗？已有的回复将不会被删除。</T>
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onDeleteClose}>
              <T>取消</T>
            </Button>
            <Button
              colorScheme="red"
              onClick={() => {
                void handleDelete();
              }}
            >
              <T>删除</T>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
