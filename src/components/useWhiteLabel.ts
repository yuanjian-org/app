import useStaticGlobalConfigs from "./useStaticGlobalConfigs";
import { WhiteLabel } from "shared/WhiteLabel";

export default function useWhiteLabel(): WhiteLabel {
  const { data } = useStaticGlobalConfigs();
  return data?.whiteLabel || "yuantu";
}
