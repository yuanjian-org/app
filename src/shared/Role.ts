/**
 * Role-based access control. TODO: Rename it to roles.ts after isPermittedDeprecated is deleted.
 */
import { ArrayElement } from "./utils/ArrayElement";
import z from "zod";

/**
 * TODO: Rename 'ADMIN' to `Admin`. Remove 'VISITOR' from all dbs.
 */
export const ALL_ROLES = [
  'ADMIN',
  'AIResearcher',
  'VISITOR',      // DEPRECATED. Do not use.
] as const;

type Role = ArrayElement<typeof ALL_ROLES>;

export default Role;

export const zRoles = z.array(z.enum(ALL_ROLES));

/**
 * @param permitted When absent, this function always returns true.
 */
export function isPermitted(userRoles : Role[], permitted?: Role | Role[]) {
  if (permitted === undefined) return true;
  if (typeof permitted === 'string') return userRoles.includes(permitted);
  return userRoles.some(ur => permitted.some(pr => pr === ur));
}

