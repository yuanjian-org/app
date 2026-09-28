import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
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
  Link,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { MdAdd } from "react-icons/md";
import trpc, { trpcNext } from "trpc";
import useMe from "useMe";
import { canAccessShudong } from "shared/ShudongPermissions";
import TopBar, { topBarPaddings } from "components/TopBar";
import { fullPage } from "AppPage";
import { componentSpacing, pageMarginX } from "theme/metrics";
import Loader from "components/Loader";
import T from "components/T";
import { ShudongPostItem } from "components/ShudongPostItem";
import { toast } from "react-toastify";

export default fullPage(() => {
  const me = useMe();
  const hasAccess = canAccessShudong(me);

  const {
    data: questions,
    isLoading,
    refetch,
  } = trpcNext.shudong.listQuestions.useQuery({}, { enabled: hasAccess });

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [questionMarkdown, setQuestionMarkdown] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      void trpc.shudong.getDraft
        .query({ shudongParentId: "root" })
        .then((draft) => {
          if (draft) setQuestionMarkdown(draft);
        });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        void trpc.shudong.saveDraft.mutate({
          shudongParentId: "root",
          markdown: questionMarkdown,
        });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [questionMarkdown, isOpen]);

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
        <VStack spacing={componentSpacing} align="stretch">
          <Flex justify="space-between" align="center">
            <Heading size="lg">
              <T>树洞</T>
            </Heading>
            <Button colorScheme="brand" leftIcon={<MdAdd />} onClick={onOpen}>
              <T>提问</T>
            </Button>
          </Flex>
        </VStack>
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
                  <Link _hover={{ textDecoration: "none" }} display="block">
                    <ShudongPostItem
                      post={question}
                      onRefetch={refetch}
                      isRootQuestion
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
              <Textarea
                placeholder="请写下你的问题..."
                value={questionMarkdown}
                onChange={(e) => setQuestionMarkdown(e.target.value)}
                rows={5}
              />
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="anon-switch" mb="0">
                  <T>匿名提问（默认开启）</T>
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
