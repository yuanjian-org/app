import z from "zod";

export function isValidEmail(email: string) {
  return z.string().email().safeParse(email).success;
}
