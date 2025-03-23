import {
  Heading,
  CardHeader,
  CardBody,
  Text,
  Flex,
  Checkbox,
  HStack, Tooltip,
  Box,
  Link,
  Button
} from '@chakra-ui/react';
import { ResponsiveCard } from 'components/ResponsiveCard';
import trpc, { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import { getTaskMarkdown, Task } from 'shared/Task';
import { useMyId } from 'useMe';
import { compareChinese, compareDate, formatUserName } from 'shared/strings';
import MarkdownStyler from 'components/MarkdownStyler';
import { ReactNode, useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { DateColumn } from 'shared/DateColumn';
import moment, { Moment } from 'moment';
import RedDot, {
  redDotRightOffset,
  redDotTransitionProps,
} from 'components/RedDot';
import { UserState } from 'shared/UserState';
import { componentSpacing } from 'theme/metrics';
import getBaseUrl from 'shared/getBaseUrl';
import { AddIcon } from '@chakra-ui/icons';
import TaskEditor, { autoTaskDescription } from './TaskEditor';
import ListItemDivider from 'components/ListItemDivider';

/**
 * @param assigneeIds The assignees of the tasks to be listed on this card.
 * @param allowMentorshipAssignment Whether to allow the user to assign tasks to
 * their mentees and mentors.
 */
export default function TasksCard({
  assigneeIds,
  allowMentorshipAssignment,
  includeTasksCreatedByMe,
}: { 
  assigneeIds: string[],
  allowMentorshipAssignment?: boolean,
  includeTasksCreatedByMe?: boolean,
}) {
  const utils = trpcNext.useContext();
  const myId = useMyId();

  const [creating, setCreating] = useState(false);
  const [includeDone, setIncludeDone] = useState(false);
  const { data, refetch } = trpcNext.tasks.list.useQuery({
    assigneeIds,
    includeTasksCreatedByMe: includeTasksCreatedByMe ?? false,
    includeDoneTasks: includeDone,
  });

  /**
   * @returns The assignee ids that the current user is allowed to assign tasks
   * to. If `allowMentorshipAssignment` is false, return the original assignee
   * ids. Otherwise, return the original assignee ids plus the ids of the
   * mentees and mentors of the current user.
   */
  const getAllowedAssigneeIds = useCallback(async () => {
    const promises: Promise<string[]>[] = [];
    if (allowMentorshipAssignment) {
      promises.push(trpc.mentorships.listMyMentorships.query({
        as: "Mentor",
      }).then(mentorships => mentorships.map(m => m.mentee.id)));
      promises.push(trpc.mentorships.listMyMentorships.query({
        as: "Mentee",
      }).then(mentorships => mentorships.map(m => m.mentor.id)));
    }

    return [
      ...assigneeIds, 
      ...(await Promise.all(promises)).flat()]
    ;
  }, [assigneeIds, allowMentorshipAssignment]);

  const sorted = data?.sort((a, b) => {
    // Place tasks that are assigned to the current user at the top.
    if (a.assignee.id === myId && b.assignee.id !== myId) return -1;
    if (a.assignee.id !== myId && b.assignee.id === myId) return 1;

    // Then Sort by assignee names
    const compName = compareChinese(a.assignee.name, b.assignee.name);
    if (compName !== 0) return compName;

    // Then place done tasks at the bottom.
    if (a.done && !b.done) return 1;
    if (!a.done && b.done) return -1;
    
    // Finally, place tasks that are updated more recently at the top.
    return compareDate(b.updatedAt, a.updatedAt);
  });

  const hasUnread = useUnreadTasks();

  const markAsRead = async () => {
    // Note that `last` covers all the tasks created by the current user.
    const last = sorted?.[0]?.updatedAt;
    if (last) await markTasksAsRead(utils, last);
  };

  return <ResponsiveCard>
    <CardHeader>
      <Flex justify="space-between">
        <Heading size="sm" position="relative">
          待办事项
          <UnreadTasksRedDot />
        </Heading>

        <HStack spacing={componentSpacing} fontSize="sm">
          <Link onClick={markAsRead} {...redDotTransitionProps(hasUnread)}>
            全部已读
          </Link>

          {/* <LinkDivider {...redDotTransitionProps(hasUnread)} /> */}

          <Link onClick={() => setIncludeDone(!includeDone)}>
            {includeDone ? "隐藏已完成" : "显示已完成"}
          </Link>

          <Button
            size="sm"
            leftIcon={<AddIcon />}
            onClick={() => setCreating(true)}
          >
            新建
          </Button>

          {creating && <TaskEditor
            getAllowedAssigneeIds={getAllowedAssigneeIds}
            onClose={() => setCreating(false)}
            refetch={refetch}
          />}

        </HStack>
      </Flex>
    </CardHeader>
    <CardBody>
      <Flex direction="column" gap={componentSpacing}>
        {sorted === undefined ? <Loader /> : sorted.length === 0 ?
          <Text color="gray">🌙&nbsp;&nbsp;一切静谧，万物安然</Text>
          :
          <TaskItems
            tasks={sorted}
            assigneeIds={assigneeIds}
            getAllowedAssigneeIds={getAllowedAssigneeIds}
            refetch={refetch}
          />
        }
      </Flex>
    </CardBody>
  </ResponsiveCard>;
}

function TaskItems({ tasks, refetch, assigneeIds, getAllowedAssigneeIds }: {
  tasks: Task[],
  refetch: () => void,
  assigneeIds: string[],
  getAllowedAssigneeIds: () => Promise<string[]>,
}) {
  const myId = useMyId();

  const items: ReactNode[] = [];
  let lastAssigneeId = myId;
  for (const t of tasks) {
    // Add a divider if the assignee is different from the last one.
    if (t.assignee.id !== lastAssigneeId) {
      lastAssigneeId = t.assignee.id;
      items.push(<ListItemDivider
        py={3}

        // Use the done status in the key to work around the situation where
        // a task is shown as not done when the user reveals done tasks right
        // after they mark the task as done.
        key={`${t.assignee.id}${t.done}`}

        // If the assignee is not in the assigneeIds, it means the task is
        // created by the current user.
        text={
          (assigneeIds.includes(t.assignee.id) ? "" : "我交给") + 
          `${formatUserName(t.assignee.name, "friendly")}的事项`
        }
      />);
    }

    items.push(<TaskItem
      key={t.id}
      t={t}
      refetch={refetch}
      getAllowedAssigneeIds={getAllowedAssigneeIds}
    />);
  }

  return <>{items}</>;
}

function TaskItem({ t, refetch, getAllowedAssigneeIds }: {
  t: Task,
  refetch: () => void,
  getAllowedAssigneeIds: () => Promise<string[]>,
}) {
  const myId = useMyId();
  const { data: state } = trpcNext.users.getUserState.useQuery();
  const lastTasksReadAt = state ? getLastTasksReadAt(state) : moment();
  const markdown = getTaskMarkdown(t, state, getBaseUrl());

  const [done, setDone] = useState(t.done);
  const [editing, setEditing] = useState<Task>();

  // N.B. Its logic must be consistent with the logic of useUnreadTasks().
  const showRedDot = !t.done && myId !== t.creator?.id &&
    moment(t.updatedAt).isAfter(lastTasksReadAt);

  const updateDone = async (done: boolean) => {
    await trpc.tasks.updateDone.mutate({
      id: t.id,
      done,
    });
    refetch();
    toast.success("待办事项已更新。");
  };

  const markdownStylerMarginY = 3;
  
  return <Tooltip
    isDisabled={t.creator !== null}
    hasArrow
    openDelay={500}
    label={autoTaskDescription}
  >
    <HStack w="full">
      <Checkbox
        isDisabled={t.creator === null}
        isChecked={done}
        onChange={async () => {
          setDone(!done);
          await updateDone(!done);
        }}
      />

      <Box
        onClick={() => setEditing(t)}
        w="full"
        cursor="pointer"
        position="relative" 
        // to offset the margin of the MarkdownStyler
        my={-markdownStylerMarginY}
        // to make sure the red dot doesn't go beyond the right edge of the
        // container
        pe={-redDotRightOffset}
      >
        {done ?
          <s><MarkdownStyler content={markdown} /></s> :
          <MarkdownStyler content={markdown} />
        }
        <RedDot show={showRedDot} top={markdownStylerMarginY} right={0} />
      </Box>

      {editing && <TaskEditor
        task={editing}
        getAllowedAssigneeIds={getAllowedAssigneeIds}
        onClose={() => setEditing(undefined)}
        refetch={refetch}
      />}

    </HStack>
  </Tooltip>;
}


/**
 * TODO: The following functions are very similar to the ones in Kudos.tsx.
 * Consider refactoring them to be shared.
 */

function getLastTasksReadAt(state: UserState): Moment {
  return moment(state.lastTasksReadAt ?? 0);
}

/**
 * The parent element should have position="relative".
 */
export function UnreadTasksRedDot() {
  const show = useUnreadTasks();
  return <RedDot show={show} />;
}

/**
 * @returns whether there are unread undone tasks that are not created by the
 * current user.
 * 
 * N.B. The logic of `showRedDot` in <TaskItem> must be consistent with the
 * logic of this function.
 */
export function useUnreadTasks() {
  const { data: state } = trpcNext.users.getUserState.useQuery();
  const { data: lastCreated } = trpcNext.tasks.getLastTasksUpdatedAt.useQuery();

  // Assume no unread tasks while the values are being fetched.
  return !!state && !!lastCreated &&
    moment(lastCreated).isAfter(getLastTasksReadAt(state));
}

async function markTasksAsRead(
  utils: ReturnType<typeof trpcNext.useContext>,
  lastTasksReadAt: DateColumn
) {
  await trpc.users.setUserState.mutate({ lastTasksReadAt });
  await utils.users.getUserState.invalidate();
}
