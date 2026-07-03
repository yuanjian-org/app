import { getWhiteLabel } from "shared/getWhiteLabel";
import Role from "../shared/Role";

export function useCanValidatePearlStudent(roles: Role[]) {
  const whiteLabel = getWhiteLabel();
  return whiteLabel === "xhef" && roles.length === 0;
}
