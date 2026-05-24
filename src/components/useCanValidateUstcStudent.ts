import useWhiteLabel from "components/useWhiteLabel";
import Role from "../shared/Role";

/**
 * A user can validate themselves as a ustc student only if the white label is
 * "ustc", they have no roles, and their email address is not yet a @ustc.edu.cn email.
 */
export function useCanValidateUstcStudent(
  roles: Role[],
  email: string | null | undefined,
) {
  const whiteLabel = useWhiteLabel();
  const isUstcEmail = email?.endsWith("@ustc.edu.cn");
  return whiteLabel === "ustc" && roles.length === 0 && !isUstcEmail;
}
