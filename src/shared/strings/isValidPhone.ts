import { chinaPhonePrefix } from "./chinaPhonePrefix";
import { removeChinaPhonePrefix } from "./removeChinaPhonePrefix";

export function isValidPhone(v: string): boolean {
  if (v.startsWith(chinaPhonePrefix)) {
    // Strip country code prefix using shared helper and validate number.
    const numberWithoutPrefix = removeChinaPhonePrefix(v) ?? "";
    return /^1[3-9]\d{9}$/.test(numberWithoutPrefix);
  } else if (!v.startsWith("+")) {
    return false;
  } else {
    // Use a heuristic. No need for strict checking as the system will verify
    // the phone number via SMS.
    return v.length >= 8;
  }
}
