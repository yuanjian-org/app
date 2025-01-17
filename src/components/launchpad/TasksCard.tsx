import {
  Heading,
  CardHeader,
  CardBody,
  Text,
  Flex,
  Checkbox,
  HStack, Tooltip,
  Box,
  Link
} from '@chakra-ui/react';
import { ResponsiveCard } from 'components/Card';
import trpc, { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import { Task } from 'shared/Task';
import { useMyId } from 'useMe';
import { compareDate, prettifyDate } from 'shared/strings';
import MarkdownStyler from 'components/MarkdownStyler';
import { useState } from 'react';
import { toast } from 'react-toastify';
import invariant from 'tiny-invariant';
import { DateColumn } from 'shared/DateColumn';
import moment, { Moment } from 'moment';
import RedDot, { redDotTransitionProps } from 'components/RedDot';
import LinkDivider from 'components/LinkDivider';
import { UserState } from 'shared/UserState';
import { componentSpacing } from 'theme/metrics';
import { defaultExamExpiryDays } from 'exams';

export default function TasksCard() {
  const utils = trpcNext.useContext();

  const [includeDone, setIncludeDone] = useState(false);
  const { data, refetch } = trpcNext.tasks.list.useQuery({
    userId: useMyId(),
    includeDone,
  });

  const sorted = data?.sort((a, b) => {
    // Place done tasks at the bottom.
    if (a.done && !b.done) return 1;
    if (!a.done && b.done) return -1;
    return compareDate(b.updatedAt, a.updatedAt);
  });

  const hasUnread = useUnreadTasks();

  const markAllAsRead = async () => {
    // Note that `last` covers all the tasks created by the current user.
    const last = sorted?.[0]?.updatedAt;
    if (last) await markTasksAsRead(utils, last);
  };

  return <ResponsiveCard>
    <CardHeader>
      <Flex justify="space-between">
        <Heading size="sm" position="relative">
          我的待办事项
          <UnreadTasksRedDot />
        </Heading>

        <HStack spacing={2} fontSize="sm">
          <Link onClick={markAllAsRead} {...redDotTransitionProps(hasUnread)}>
            全部已读
          </Link>
          <LinkDivider  {...redDotTransitionProps(hasUnread)} />
          <Link onClick={() => setIncludeDone(!includeDone)}>
            {includeDone ? "隐藏已完成" : "显示已完成"}
          </Link>
        </HStack>
      </Flex>
    </CardHeader>
    <CardBody>
      <Flex direction="column" gap={componentSpacing}>
        {sorted === undefined ? <Loader /> : sorted.length === 0 ?
          <Text color="gray">🌙&nbsp;&nbsp;一切静谧，万物安然</Text>
          :
          sorted.map(t => <TaskItem key={t.id} t={t} refetch={refetch} />)
        }
      </Flex>
    </CardBody>
  </ResponsiveCard>;
}

function useAutoTaskMarkdown(t: Task): string {
  const { data: state } = trpcNext.users.getUserState.useQuery(undefined, {
    enabled: t.autoTaskId !== "study-comms",
  });

  if (t.autoTaskId === null) {
    invariant(t.markdown !== null, "both autoTaskId and markdown are null");
    return t.markdown;

  } else if (t.autoTaskId === "study-comms") {
    const base = "[《学生通讯原则》](/study/comms)自学与评测";
    if (t.done || !state) {
      return `请完成${base}。`;
    } else if (!state.commsExam) {
      return `请完成${base}，之后即可访问相关学生的资料。`;
    } else {
      const expiry = moment(state.commsExam).add(defaultExamExpiryDays, "days");
      return `请完成年度${base}。上次评测结果将于**${prettifyDate(expiry.toDate())}` +
        `**过期。过期后，相关学生资料将无法访问。`;
    }

  } else {
    invariant(false, "invalid autoTaskId");
  }
}

function TaskItem({ t, refetch }: {
  t: Task,
  refetch: () => void,
}) {
  const myId = useMyId();
  const { data: state } = trpcNext.users.getUserState.useQuery();
  const lastTasksReadAt = state ? getLastTasksReadAt(state) : moment();
  const markdown = useAutoTaskMarkdown(t);

  const [done, setDone] = useState(t.done);

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

  return <Tooltip
    isDisabled={t.creator !== null}
    hasArrow
    openDelay={500}
    label="此为自动生成的待办事项。完成相应任务后，系统会自动更新状态"
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

      {/* -3 to offset the margin of the MarkdownStyler */}
      <Box position="relative" my={-3}>
        {done ?
          <s><MarkdownStyler content={markdown} /></s> :
          <MarkdownStyler content={markdown} />
        }
        <RedDot show={showRedDot} right={-3} top={3} />
      </Box>
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
