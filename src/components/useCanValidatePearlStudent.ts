import { whiteLabel } from "shared/WhiteLabel";
import Role from "../shared/Role";

export function useCanValidatePearlStudent(roles: Role[]) {
  return whiteLabel === "xhef" && roles.length === 0;
}
