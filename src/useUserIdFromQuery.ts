import { useRouter } from "next/router";
import { parseQueryString } from "shared/strings/parseQueryString";
import { useMyId } from "useMe";

export function useUserIdFromQuery() {
  const queryUserId = parseQueryString(useRouter(), "userId");
  const myId = useMyId();
  return queryUserId === "me" ? myId : queryUserId;
}
