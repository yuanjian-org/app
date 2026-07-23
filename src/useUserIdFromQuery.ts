import { useRouter } from "next/router";
import { parseQueryString } from "shared/strings/parseQueryString";
import { useMyId } from "useMe";

export function useUserIdFromQuery(): string | undefined {
  const router = useRouter();
  const queryUserId = parseQueryString(router, "userId");
  const myId = useMyId();
  return queryUserId === "me" ? myId : queryUserId;
}
