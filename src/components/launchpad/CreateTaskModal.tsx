import {
  Button,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  ModalContent,
  HStack,
  Text,
  Radio,
  VStack,
  RadioGroup,
  Input
} from "@chakra-ui/react";
import ModalWithBackdrop from "components/ModalWithBackdrop";
import { UserName } from "components/UserChip";
import { useEffect, useState } from "react";
import invariant from "shared/invariant";
import { componentSpacing } from "theme/metrics";
import { trpcNext } from "trpc";
import { useMyId } from "useMe";

export function CreateTaskModal({ allowedAssigneeIds, onClose }: {
  allowedAssigneeIds: string[],
  onClose: () => void,
}) {
  const [assigneeId, setAssigneeId] = useState<string>();
  const [markdown, setMarkdown] = useState("");

  const myId = useMyId();

  // Select myself by default
  useEffect(() => {
    if (allowedAssigneeIds.includes(myId)) setAssigneeId(myId);
  }, [allowedAssigneeIds, myId, setAssigneeId]);
  
  return <ModalWithBackdrop isOpen={true} onClose={onClose} isCentered>
    <ModalContent>
      <ModalHeader>新建待办事项</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <VStack spacing={componentSpacing} align="start">
          <AssigneeSelector
            assigneeIds={allowedAssigneeIds}
            selected={assigneeId}
            onSelect={setAssigneeId}
          />
          <Input
            placeholder="待办事项"
            autoFocus
            value={markdown}
            onChange={e => setMarkdown(e.target.value)}
          />
        </VStack>
      </ModalBody>

      <ModalFooter>
        <HStack spacing={componentSpacing}>
          <Button onClick={onClose}>取消</Button>
          <Button
            isDisabled={!assigneeId || markdown.trim().length === 0}
            variant="brand"
            onClick={onClose}
          >
            确认
          </Button>
        </HStack>
      </ModalFooter>
    </ModalContent>

  </ModalWithBackdrop>;
}

function AssigneeSelector({ assigneeIds, selected, onSelect }: {
  assigneeIds: string[],
  selected: string | undefined,
  onSelect: (assigneeId: string) => void,
}) {
  invariant(assigneeIds.length > 0, "assigneeIds must not be empty");

  const myId = useMyId();
  const usersRes = trpcNext.useQueries(t => {
    return assigneeIds
      // Put myself at the top
      .sort((a, b) => {
        if (a === myId) return -1;
        if (b === myId) return 1;
        return 0;
      })
      .map(id => t.users.get(id));
  });

  const users = usersRes.map(res => res.data).filter(u => u !== undefined);
  
  return <HStack spacing={componentSpacing} align="start">
    <Text fontWeight="bold">待办人：</Text>
    <RadioGroup onChange={onSelect} value={selected}>
      <HStack spacing={2}>
        {users.map(user => {
          invariant(user !== undefined, "user undefined in AssigneeSelector");
          return <Radio key={user.id} value={user.id}>
            <UserName user={user} />
          </Radio>;
        })}
      </HStack>
    </RadioGroup>
  </HStack>;
}
