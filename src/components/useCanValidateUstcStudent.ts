import useWhiteLabel from "components/useWhiteLabel";
import Role from "../shared/Role";
import useMe from "../useMe";

/**
 * A user can validate themselves as a ustc student only if the white label is
 * "ustc", they have no roles, and their email address is not yet a @ustc.edu.cn email.
 */
export function useCanValidateUstcStudent(myRoles: Role[]) {
  const whiteLabel = useWhiteLabel();
  const me = useMe();
  const isUstcEmail = me.email?.endsWith("@ustc.edu.cn");
  return whiteLabel === "ustc" && myRoles.length === 0 && !isUstcEmail;
}
