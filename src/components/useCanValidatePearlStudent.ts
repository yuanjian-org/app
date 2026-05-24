import useWhiteLabel from "components/useWhiteLabel";
import Role from "../shared/Role";

export function useCanValidatePearlStudent(roles: Role[]) {
  const whiteLabel = useWhiteLabel();
  return whiteLabel === "xhef" && roles.length === 0;
}
