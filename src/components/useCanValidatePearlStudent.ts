import { useWhiteLabel } from "components/useStaticConfigs";
import Role from "../shared/Role";

export function useCanValidatePearlStudent(roles: Role[]) {
  const whiteLabel = useWhiteLabel();
  return whiteLabel === "xhef" && roles.length === 0;
}
