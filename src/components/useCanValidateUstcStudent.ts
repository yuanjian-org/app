import useWhiteLabel from "components/useWhiteLabel";

/**
 * A user can validate themselves as a ustc student only if the white label is
 * "ustc" and their email address is not yet a @ustc.edu.cn email.
 */
export function useCanValidateUstcStudent(email: string | null | undefined) {
  const whiteLabel = useWhiteLabel();
  const isUstcEmail = email?.endsWith("@ustc.edu.cn");
  return whiteLabel === "ustc" && !isUstcEmail;
}
