import { useSession } from "next-auth/react";
import invariant from "tiny-invariant";

export default function useMe() {
  const { data } = useSession();
  invariant(data);
  return data.user;
}

export function useMyRoles() {
  const { data } = useSession();
  invariant(data);
  return data.user.roles;
}

export function useMyId() {
  const { data } = useSession();
  invariant(data);
  return data.user.id;
}
