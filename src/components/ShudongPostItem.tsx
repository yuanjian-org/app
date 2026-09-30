import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
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
} from "@chakra-ui/react";
import { FiThumbsUp } from "react-icons/fi";
import {
  ChatIcon,
  EditIcon,
  DeleteIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@chakra-ui/icons";
import { motion, AnimatePresence } from "framer-motion";
import trpc, { trpcNext } from "trpc";
import { ShudongPost } from "shared/Shudong";
import { canEditOrDeleteShudongPost } from "shared/ShudongPermissions";
import useMe from "useMe";
import { prettifyDate } from "shared/strings/prettifyDate";
import { formatUserName } from "shared/strings/formatUserName";
import MarkdownStyler from "./MarkdownStyler";
import { toast } from "react-toastify";
import T from "components/T";
import { UserLink } from "./UserChip";

export function ShudongPostMetadata({ post }: { post: ShudongPost }) {
  const isAnon = post.isAnonymous || !post.author;
  const authorName = post.author ? formatUserName(post.author.name) : "匿名";

  return (
    <HStack spacing={3} alignItems="center">
      <Avatar
        size="sm"
        name={isAnon ? "匿名" : authorName}
        bg={isAnon ? "gray.400" : "brand.a"}
        color="white"
      />
      <VStack spacing={0} align="start">
        <HStack spacing={2} align="center">
          {isAnon ? (
            <Text fontWeight="bold" fontSize="sm" color="gray.600">
              <T>匿名</T>
            </Text>
          ) : (
            <Text fontWeight="bold" fontSize="sm">
              <UserLink user={post.author!} />
            </Text>
          )}
          {post.isEdited && (
            <Badge variant="subtle" colorScheme="gray" fontSize="xs">
              <T>已编辑</T>
            </Badge>
          )}
          {post.isDeleted && (
            <Badge variant="subtle" colorScheme="gray" fontSize="xs">
              <T>已删除</T>
            </Badge>
          )}
        </HStack>
        <Text fontSize="xs" color="gray.500">
          {prettifyDate(post.createdAt)}
        </Text>
      </VStack>
    </HStack>
  );
}

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
  const router = useRouter();
  const [localHasUpvoted, setLocalHasUpvoted] = useState(
    post.userHasUpvoted ?? false,
  );
  const [localUpvoteCount, setLocalUpvoteCount] = useState(post.upvoteCount);
  const [showPlusOneAnime, setShowPlusOneAnime] = useState(false);

  const [isReplying, setIsReplying] = useState(false);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const [replyMarkdown, setReplyMarkdown] = useState("");
  const [replyIsAnon, setReplyIsAnon] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editMarkdown, setEditMarkdown] = useState(post.markdown);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [showChildResponses, setShowChildResponses] = useState(false);

  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();

  const { data: childResponses, refetch: refetchChildren } =
    trpcNext.shudong.getResponses.useQuery(
      { parentId: post.id },
      { enabled: showChildResponses },
    );

  const animeDurationInSeconds = 1.5;

  const handleUpvote = useCallback(async () => {
    if (localHasUpvoted) {
      setLocalHasUpvoted(false);
      setLocalUpvoteCount((c) => Math.max(0, c - 1));
    } else {
      setLocalHasUpvoted(true);
      setLocalUpvoteCount((c) => c + 1);
      setShowPlusOneAnime(true);
      setTimeout(
        () => setShowPlusOneAnime(false),
        animeDurationInSeconds * 1000,
      );
    }
    try {
      const res = await trpc.shudong.toggleUpvote.mutate({ postId: post.id });
      setLocalHasUpvoted(res.userHasUpvoted);
      setLocalUpvoteCount(res.upvoteCount);
    } catch (err: any) {
      toast.error(err.message || "点赞失败");
    }
  }, [localHasUpvoted, post.id]);

  useEffect(() => {
    if (isReplying) {
      void trpc.shudong.getDraft
        .query({ shudongParentId: post.id })
        .then((draft) => {
          if (draft) setReplyMarkdown(draft);
        });
    }
  }, [isReplying, post.id]);

  useEffect(() => {
    if (isReplying) {
      const timer = setTimeout(() => {
        void trpc.shudong.saveDraft.mutate({
          shudongParentId: post.id,
          markdown: replyMarkdown,
        });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [replyMarkdown, isReplying, post.id]);

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
    } catch (err: any) {
      toast.error(err.message || "发送回复失败");
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
    } catch (err: any) {
      toast.error(err.message || "修改失败");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDelete = async () => {
    try {
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
    } catch (err: any) {
      toast.error(err.message || "删除失败");
    }
  };

  const canEditOrDelete =
    !hideEditDelete && canEditOrDeleteShudongPost(me, post.author?.id ?? null);

  return (
    <Box
      p={4}
      borderWidth="1px"
      borderRadius="md"
      bg="white"
      boxShadow="sm"
      w="100%"
    >
      <Flex justify="space-between" align="start" mb={3}>
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
          <Textarea
            value={editMarkdown}
            onChange={(e) => setEditMarkdown(e.target.value)}
            rows={3}
          />
          <HStack justify="end">
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
        </VStack>
      ) : (
        <Box mb={3}>
          {post.isDeleted ? (
            <Text color="gray.400" fontStyle="italic">
              <T>【该内容已被删除】</T>
            </Text>
          ) : (
            <MarkdownStyler content={post.markdown} />
          )}
        </Box>
      )}

      <HStack spacing={4} align="center" fontSize="sm" color="gray.600">
        {!post.isDeleted && (
          <Box position="relative" display="flex" alignItems="center">
            <Text
              display="flex"
              alignItems="center"
              color={localHasUpvoted ? "black" : "gray.600"}
              fontWeight={localHasUpvoted ? "bold" : "normal"}
              cursor="pointer"
              role="button"
              tabIndex={0}
              aria-label="点赞"
              onClick={() => {
                void handleUpvote();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void handleUpvote();
                }
              }}
            >
              <Icon as={FiThumbsUp} mr={1} boxSize={4} />
              {localUpvoteCount > 0 && localUpvoteCount}
            </Text>

            <AnimatePresence>
              {showPlusOneAnime && (
                <motion.div
                  initial={{ opacity: 1, x: -10, y: 0 }}
                  animate={{ opacity: 0, x: -10, y: -60 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: animeDurationInSeconds }}
                  style={{
                    position: "absolute",
                    left: "50%",
                    fontSize: "1.8em",
                    fontWeight: "bold",
                    color: "orange",
                    pointerEvents: "none",
                    zIndex: 10,
                  }}
                >
                  +1
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        )}

        {(isHomePage || !isRootQuestion) && (
          <>
            {!post.isDeleted && (
              <Text
                display="flex"
                alignItems="center"
                cursor="pointer"
                role="button"
                tabIndex={0}
                aria-label="回复"
                onClick={() => {
                  if (isHomePage) {
                    void router.push(`/shudong/${post.id}`);
                  } else {
                    setIsReplying((prev) => {
                      const next = !prev;
                      if (next) {
                        setTimeout(() => replyInputRef.current?.focus(), 100);
                      }
                      return next;
                    });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (isHomePage) {
                      void router.push(`/shudong/${post.id}`);
                    } else {
                      setIsReplying((prev) => {
                        const next = !prev;
                        if (next) {
                          setTimeout(() => replyInputRef.current?.focus(), 100);
                        }
                        return next;
                      });
                    }
                  }
                }}
              >
                <ChatIcon mr={1} />
                <T>回复</T>
              </Text>
            )}

            {post.responseCount > 0 && (
              <Button
                size="xs"
                variant="ghost"
                leftIcon={
                  showChildResponses ? <ChevronUpIcon /> : <ChevronDownIcon />
                }
                onClick={() => {
                  if (isHomePage) {
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
          </>
        )}
      </HStack>

      {isReplying && (
        <VStack
          align="stretch"
          spacing={2}
          mt={3}
          p={3}
          bg="gray.50"
          borderRadius="md"
        >
          <Textarea
            ref={replyInputRef}
            placeholder="写下你的回复..."
            value={replyMarkdown}
            onChange={(e) => setReplyMarkdown(e.target.value)}
            rows={2}
          />
          <Flex justify="space-between" align="center">
            <FormControl display="flex" alignItems="center" w="auto">
              <FormLabel htmlFor="reply-anon-switch" mb="0" fontSize="xs">
                <T>匿名回复</T>
              </FormLabel>
              <Switch
                id="reply-anon-switch"
                size="sm"
                isChecked={replyIsAnon}
                onChange={(e) => setReplyIsAnon(e.target.checked)}
              />
            </FormControl>

            <HStack spacing={2}>
              <Button size="xs" onClick={() => setIsReplying(false)}>
                <T>取消</T>
              </Button>
              <Button
                size="xs"
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
