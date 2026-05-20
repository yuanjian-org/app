import useStaticGlobalConfigs from "./useStaticGlobalConfigs";

export default function useWhiteLabel() {
  const { data } = useStaticGlobalConfigs();
  return data?.whiteLabel || "yuantu";
}
