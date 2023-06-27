/**
 * Role-based access control
 */
import { ArrayElement } from "./utils/ArrayElement";
import z from "zod";

export type Role = ArrayElement<typeof ALL_ROLES>;

export const ALL_ROLES = [
  'ANYONE',   // Implict to all users. Not to be persisted in the User table.
  'ADMIN',
  'VISITOR',  // Deprecated. TODO: remove it from all dbs (including all local dev dbs).
  'INTEGRATION',
] as const;

export const zRoleArr = z.array(z.enum(ALL_ROLES));

/**
 * TODO: Remove this structure. Refactor
 * 
 *  `auth{User,Integration}(r: Resource)`
 *
 *    into:
 *
 *  `auth{User,Integration}(r: Role)` # Allow only a single role.
 */
const ACL = {
  'me:read': ['ADMIN', 'VISITOR'] as Role[],
  'me:write': ['ADMIN', 'VISITOR'] as Role[],
  'my-groups:read': ['ADMIN', 'VISITOR'] as Role[],
  'my-groups:write': ['ADMIN', 'VISITOR'] as Role[],

  'users:read': ['ADMIN'] as Role[],
  'users:write': ['ADMIN'] as Role[],
  'groups:read': ['ADMIN'] as Role[],
  'groups:write': ['ADMIN'] as Role[],

  'open-to-all': ['ADMIN', 'VISITOR'] as Role[],
  'no-access': [] as Role[],

  'transcripts:read': ['INTEGRATION'] as Role[],
  'summaries:write': ['INTEGRATION'] as Role[],
} as const;

type StringKeys<objType extends {}> = Array<Extract<keyof objType, string>>

export type Resource = ArrayElement<StringKeys<typeof ACL>>;

export function isPermitted(userRoles : Role[], resourceRole: Role) {
  return resourceRole === 'ANYONE' || userRoles.includes(resourceRole); 
}

export const isPermittedDeprecated = (roles: Role[], resource: Resource) => {
  if (ACL[resource].includes('VISITOR')) return true;
  for (const r of roles) {
    if (ACL[resource].includes(r)) {
      return true;
    }
  }

  return false;
}
