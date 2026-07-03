import { WhiteLabel, zWhiteLabel } from "./WhiteLabel";

export function getWhiteLabel(): WhiteLabel {
  const parsed = zWhiteLabel.safeParse(process.env.NEXT_PUBLIC_WHITE_LABEL);
  return parsed.success ? parsed.data : "yuantu";
}
