import { whiteLabel } from "shared/WhiteLabel";
/**
 * A user can validate themselves as a ustc student only if the white label is
 * "ustc" and their email address is not yet a @mail.ustc.edu.cn email.
 */
export function useCanValidateUstcStudent(email: string | null | undefined) {
  const isUstcEmail = email?.endsWith("@mail.ustc.edu.cn");
  return whiteLabel === "ustc" && !isUstcEmail;
}
