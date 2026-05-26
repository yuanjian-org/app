import moment, { Moment } from "moment";
import { UserState } from "shared/UserState";
import { DateColumn } from "shared/DateColumn";
import trpc, { trpcNext } from "trpc";
import { isPermitted } from "shared/Role";
import RedDot from "components/RedDot";
import { useMyRoles } from "useMe";

export function getLastTasksReadAt(state: UserState): Moment {
  return moment(state.lastTasksReadAt ?? 0);
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
  return (
    !!state &&
    !!lastCreated &&
    moment(lastCreated).isAfter(getLastTasksReadAt(state))
  );
}

/**
 * The parent element should have position="relative".
 */
export function UnreadTasksRedDot() {
  const show = useUnreadTasks();
  return <RedDot show={show} />;
}

export async function markTasksAsRead(
  utils: ReturnType<typeof trpcNext.useContext>,
  lastTasksReadAt: DateColumn,
) {
  await trpc.users.setMyState.mutate({ lastTasksReadAt });
  await utils.users.getUserState.invalidate();
}

export function getLastKudosReadAt(state: UserState): Moment {
  // If lastKudosReadAt is absent, treat consentedAt as the last read time.
  // If consentedAt is also absent, then use the current time.
  // `moment(undefined)` returns the current time.
  return moment(state.lastKudosReadAt ?? state.consentedAt);
}

/**
 * @returns whether there are unread kudos.
 */
export function useUnreadKudos() {
  const myRoles = useMyRoles();
  const { data: state } = trpcNext.users.getUserState.useQuery();
  const { data: lastCreated } = trpcNext.kudos.getLastKudosCreatedAt.useQuery(
    undefined,
    { enabled: isPermitted(myRoles, "Volunteer") },
  );

  // Check permission after all hooks are called
  if (!isPermitted(myRoles, "Volunteer")) return false;

  // Assume no unread kudos while the values are being fetched.
  return (
    !!state &&
    !!lastCreated &&
    moment(lastCreated).isAfter(getLastKudosReadAt(state))
  );
}

/**
 * The parent element should have position="relative".
 */
export function UnreadKudosBlueDot() {
  const show = useUnreadKudos();
  return <RedDot show={show} blue />;
}

export async function markKudosAsRead(
  utils: ReturnType<typeof trpcNext.useContext>,
  lastKudosReadAt: DateColumn,
) {
  await trpc.users.setMyState.mutate({ lastKudosReadAt });
  await utils.users.getUserState.invalidate();
}
