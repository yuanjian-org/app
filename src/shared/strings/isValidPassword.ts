import { passwordMinLength } from "./passwordMinLength";

// TODO check against common passwords
export function isValidPassword(password: string): boolean {
  return password.length >= passwordMinLength && password.length < 80;
}
