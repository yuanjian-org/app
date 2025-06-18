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
  Input,
  Box
} from "@chakra-ui/react";
import MarkdownStyler from "components/MarkdownStyler";
import MarkdownSupport from "components/MarkdownSupport";
import ModalWithBackdrop from "components/ModalWithBackdrop";
import { SmallGrayText } from "components/SmallGrayText";
import { UserName } from "components/UserChip";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import getBaseUrl from "shared/getBaseUrl";
import invariant from "shared/invariant";
import { getTaskMarkdown, isAutoTask, Task } from "shared/Task";
import { componentSpacing } from "theme/metrics";
import trpc, { trpcNext } from "trpc";
import { useMyId } from "useMe";

/**
 * @param task The task to edit. If not provided, a new task will be created.
 */
export default function TaskEditor({
  task,
  getAllowedAssigneeIds,
  onClose,
  refetch,
}: {
  task?: Task,
  getAllowedAssigneeIds: () => Promise<string[]>,
  onClose: () => void,
  refetch: () => void,
}) {
  const [assigneeId, setAssigneeId] = useState<string | undefined>(
    task?.assignee.id);
  const [markdown, setMarkdown] = useState(task?.markdown ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    invariant(assigneeId && markdown, "assigneeId && markdown can't be empty");
    setIsSaving(true);
    try {
      if (task) {
        await trpc.tasks.update.mutate({
          id: task.id,
          assigneeId,
          markdown,
        });
      } else {
        await trpc.tasks.create.mutate({
          assigneeId,
          markdown,
        });
      }
      refetch();
      toast.success("待办事项已创建。");
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const isAuto = task && isAutoTask(task);

  return <ModalWithBackdrop isOpen={true} onClose={onClose} isCentered>
    <ModalContent>
      <ModalHeader>
        {task ? "编辑" : "新建"}
        待办事项
      </ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <VStack spacing={componentSpacing} align="start">

          {!isAuto &&
            <AssigneeSelector
              getAllowedAssigneeIds={getAllowedAssigneeIds}
              selected={assigneeId}
              setSelected={setAssigneeId}
            />
          }

          {isAuto ?
            <Box
              w="full"
              p={2}
              borderRadius="md" 
              borderWidth="1px" 
              borderColor="gray.200" 
              bg="gray.50"
            >
              <MarkdownStyler 
                content={getTaskMarkdown(task as Task, undefined, getBaseUrl())}
              />
            </Box>
            :
            <Input
              placeholder="待办事项"
              autoFocus
              value={markdown}
              onChange={e => setMarkdown(e.target.value)}
            />
          }

          {task?.creator &&
            <HStack justify="space-between" w="full">
              <SmallGrayText>
                创建人：<UserName user={task.creator} />
              </SmallGrayText>
              <MarkdownSupport fontSize="sm" />
            </HStack>
          }

          {isAuto &&
            <SmallGrayText>
              此为自动生成的事项。完成相应任务后，系统会自动标记为已完成。
            </SmallGrayText>
          }

        </VStack>
      </ModalBody>

      <ModalFooter>
        <HStack spacing={componentSpacing}>
          <Button variant="ghost" color="gray" onClick={onClose}>取消</Button>
          <Button
            isDisabled={!assigneeId || markdown.trim().length === 0}
            variant="brand"
            isLoading={isSaving}
            onClick={save}
          >
            确认
          </Button>

        </HStack>
      </ModalFooter>
    </ModalContent>

  </ModalWithBackdrop>;
}

function AssigneeSelector({ 
  getAllowedAssigneeIds,
  selected,
  setSelected,
}: {
  getAllowedAssigneeIds: () => Promise<string[]>,
  selected: string | undefined,
  setSelected: (assigneeId: string) => void,
}) {
  const myId = useMyId();
  const [allowedAssigneeIds, setAllowedAssigneeIds] = useState<string[]>([]);

  const initialize = useCallback(async () => {
    // Do not update it if already initialized
    if (allowedAssigneeIds.length > 0) return;

    const ids = await getAllowedAssigneeIds();
    invariant(ids.length > 0, "empty allowedAssigneeIds");

    // Always include the selected assignee
    if (selected && !ids.includes(selected)) {
      ids.unshift(selected);
    }

    // Always put myself at the front
    ids.sort((a, b) => {
      if (a === myId) return -1;
      if (b === myId) return 1;
      return 0;
    });

    setAllowedAssigneeIds(ids);

    // Select myself by default
    if (selected === undefined && ids.includes(myId)) {
      setSelected(myId);
    }
  }, [allowedAssigneeIds, getAllowedAssigneeIds, selected, setSelected, myId]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const users = trpcNext.useQueries(t => allowedAssigneeIds
    .map(id => t.users.get(id)))
    .map(res => res.data)
    .filter(u => u !== undefined);
  
  return <HStack align="start">
    <Text fontWeight="bold">待办人：</Text>
    <RadioGroup onChange={setSelected} value={selected}>
      <HStack spacing={2}>
        {users.map(user => {
          invariant(user !== undefined, "AssigneeSelector user undefined");
          return <Radio key={user.id} value={user.id}>
            <UserName user={user} />
          </Radio>;
        })}
      </HStack>
    </RadioGroup>
  </HStack>;
}
