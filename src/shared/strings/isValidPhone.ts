import { chinaPhonePrefix } from "./chinaPhonePrefix";

export function isValidPhone(v: string): boolean {
  if (v.startsWith(chinaPhonePrefix)) {
    return /^1[3-9]\d{9}$/.test(v.slice(chinaPhonePrefix.length));
  } else if (!v.startsWith("+")) {
    return false;
  } else {
    // Use a heuristic. No need for strict checking as the system will verify
    // the phone number via SMS.
    return v.length >= 8;
  }
}
