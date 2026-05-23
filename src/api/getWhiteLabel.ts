import { WhiteLabel, zWhiteLabel } from "shared/WhiteLabel";

/**
 * Use `useStaticGlobalConfigs()` on the client side
 */
export function getWhiteLabel(): WhiteLabel {
  const parsed = zWhiteLabel.safeParse(process.env.WHITE_LABEL);
  if (parsed.success) {
    return parsed.data;
  }
  return "yuantu";
}
