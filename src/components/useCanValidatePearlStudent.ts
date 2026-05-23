import useWhiteLabel from "components/useWhiteLabel";
import Role from "../shared/Role";

/**
 * A user can validate themselves as a pearl student only if the white label is
 * "xhef" and they have no roles.
 */
export function useCanValidatePearlStudent(myRoles: Role[]) {
  const whiteLabel = useWhiteLabel();
  return whiteLabel === "xhef" && myRoles.length === 0;
}
