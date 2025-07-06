import {
  Button,
  VStack,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  FormControl,
  FormLabel,
  ModalFooter,
  Textarea,
} from "@chakra-ui/react";
import { formatUserName } from "shared/strings";
import { MinUser } from "shared/User";
import { useState } from "react";
import ModalWithBackdrop from "components/ModalWithBackdrop";
import trpc from "trpc";
import invariant from "tiny-invariant";

/**
 * @param mentor Set to null to book with any mentor
 */
export default function MentorBookingModal({
  mentor,
  onClose,
}: {
  mentor: MinUser | null;
  onClose: () => void;
}) {
  const [topic, setTopic] = useState<string>();
  const [submitting, setSubmitting] = useState<boolean>();
  const [submitted, setSubmitted] = useState<boolean>();

  const submit = async () => {
    setSubmitting(true);
    try {
      invariant(topic);
      await trpc.mentorBookings.create.mutate({
        requestedMentorId: mentor?.id ?? null,
        topic,
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return !submitted ? (
    <ModalWithBackdrop isCentered isOpen onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          预约
          {mentor
            ? `导师：${formatUserName(mentor.name, "formal")}`
            : "不定期导师"}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={6}>
            <FormControl>
              <FormLabel>
                你希望
                {mentor && `与${formatUserName(mentor.name, "friendly")}`}
                交流的话题：
              </FormLabel>
              <Textarea
                autoFocus
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={
                  mentor === null
                    ? "请尽可能详细填写，让我们帮助你找到最适合的导师。"
                    : "比如：职业规划、简历诊断、感情话题。"
                }
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="brand"
            isLoading={submitting}
            isDisabled={!topic}
            onClick={submit}
          >
            提交
          </Button>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  ) : (
    <ModalWithBackdrop isCentered isOpen onClose={onClose}>
      <ModalContent>
        <ModalHeader>预约请求已提交</ModalHeader>
        <ModalCloseButton />
        <ModalBody>我们的工作人员会尽快与你联系。</ModalBody>
        <ModalFooter>
          <Button variant="brand" onClick={onClose}>
            好的
          </Button>
        </ModalFooter>
      </ModalContent>
      –{" "}
    </ModalWithBackdrop>
  );
}
