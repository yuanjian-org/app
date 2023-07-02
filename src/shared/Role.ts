import { ArrayElement } from "./utils/ArrayElement";
import z from "zod";

export const AllRoles = [
  'UserManager',
  'SummaryEngineer',
] as const;

type Role = ArrayElement<typeof AllRoles>;

export default Role;

export const zRoles = z.array(z.enum(AllRoles));

/**
 * @param permitted When absent, this function always returns true.
 */
export function isPermitted(userRoles : Role[], permitted?: Role | Role[]) {
  if (permitted === undefined) return true;
  if (typeof permitted === 'string') return userRoles.includes(permitted);
  return userRoles.some(ur => permitted.some(pr => pr === ur));
}
