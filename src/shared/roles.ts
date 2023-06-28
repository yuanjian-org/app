/**
 * Role-based access control. TODO: Rename it to roles.ts after isPermittedDeprecated is deleted.
 */
import { ArrayElement } from "./utils/ArrayElement";
import z from "zod";

export const ALL_ROLES = [
  // TODO: Rename to `Admin`
  'ADMIN',

  'AI Researcher',

  // DEPRECATED. Do not use. TODO: remove it from all dbs (including all local dev dbs).
  'VISITOR',
] as const;

export type Role = ArrayElement<typeof ALL_ROLES>;

export const zRoles = z.array(z.enum(ALL_ROLES));

/**
 * @param permitted When absent, this function always returns true.
 */
export function isPermitted(userRoles : Role[], permitted?: Role) {
  return permitted === undefined || userRoles.includes(permitted);
}

