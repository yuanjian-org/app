import { useSession } from "next-auth/react";
import invariant from "shared/invariant";

export default function useMe() {
  const { data } = useSession();
  invariant(data, "Session data is required for useMe");
  return data.me;
}

export function useMyRoles() {
  const { data } = useSession();
  invariant(data, "Session data is required for useMyRoles");
  return data.me.roles;
}

export function useMyId() {
  const { data } = useSession();
  invariant(data, "Session data is required for useMyId");
  return data.me.id;
}

export function useMeOptional() {
  const { data } = useSession();
  return data?.me;
}

export function useMyRolesOptional() {
  const { data } = useSession();
  return data?.me?.roles;
}
