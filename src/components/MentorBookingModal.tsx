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
} from '@chakra-ui/react';
import { formatUserName } from 'shared/strings';
import { MinUser } from 'shared/User';
import { useState } from 'react';
import ModalWithBackdrop from 'components/ModalWithBackdrop';

export default function MentorBookingModal({ mentor, onClose }: {
  mentor: MinUser | null,
  onClose: () => void,
}) {
  const [comment, setComment] = useState<string>();
  const [submitting, setSubmitting] = useState<boolean>();
  const [submitted, setSubmitted] = useState<boolean>();

  const submit =() => {
    setSubmitting(true);
    try {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return !submitted ? <ModalWithBackdrop isCentered isOpen onClose={onClose}>
    <ModalContent>
      <ModalHeader>
        预约{mentor ? `：${formatUserName(mentor.name, "formal")}` : "不定期导师"}
      </ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <VStack spacing={6}>
          <FormControl>
            <FormLabel>
              希望
              {mentor && `与${formatUserName(mentor.name, "friendly")}`}
              交流的话题：
            </FormLabel>
            <Textarea
              autoFocus
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={mentor === null ?
                "请尽可能详细填写，让我们帮助你找到最适合的导师。" :
                "比如：职业规划、简历诊断、感情话题。"}
            />
          </FormControl>
        </VStack>
      </ModalBody>
      <ModalFooter>
        <Button variant="brand" isLoading={submitting} isDisabled={!comment}
          onClick={submit}>预约</Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>

  :

  <ModalWithBackdrop isCentered isOpen onClose={onClose}>
    <ModalContent>
      <ModalHeader>
          预约请求已提交
      </ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        我们的工作人员会尽快与你联系。
      </ModalBody>
      <ModalFooter>
        <Button variant="brand" onClick={onClose}>好的</Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}
