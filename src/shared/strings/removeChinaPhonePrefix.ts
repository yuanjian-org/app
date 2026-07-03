import { chinaPhonePrefix } from "./chinaPhonePrefix";

export function removeChinaPhonePrefix(v: string | null) {
  if (v && v.startsWith(chinaPhonePrefix)) {
    return v.slice(chinaPhonePrefix.length);
  } else {
    return v;
  }
}
