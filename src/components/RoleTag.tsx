import { Tag } from "@chakra-ui/react";
import Role, { displayName, isPermitted } from "shared/Role";

export function RoleTag({ roles }: { roles: Role[] }) {
  const { r, c }: { r: Role | null; c: string } = isPermitted(
    roles,
    "TransactionalMentor",
  )
    ? { r: "TransactionalMentor", c: "red" }
    : isPermitted(roles, "SeniorMentor")
      ? { r: "SeniorMentor", c: "blue" }
      : isPermitted(roles, "Mentor")
        ? { r: "Mentor", c: "teal" }
        : isPermitted(roles, "Volunteer")
          ? { r: "Volunteer", c: "orange" }
          : { r: null, c: "grey" };

  return r ? <Tag colorScheme={c}>{displayName(r)}</Tag> : null;
}
