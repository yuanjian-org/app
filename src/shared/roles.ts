/**
 * Role-based access control. TODO: Rename it to roles.ts after isPermittedDeprecated is deleted.
 */
import { ArrayElement } from "./utils/ArrayElement";
import z from "zod";

export const ALL_ROLES = [
  // Implict to all users. Not to be persisted in the User table.
  'Anyone',
  
  // TODO: Rename to `Admin`
  'ADMIN',

  'AI Researcher',

  // For app integraion only.
  'Integration',

  // DEPRECATED. Do not use. TODO: remove it from all dbs (including all local dev dbs).
  'VISITOR',
] as const;

export type Role = ArrayElement<typeof ALL_ROLES>;

export const zRoles = z.array(z.enum(ALL_ROLES));

/**
 * TODO: Remove this structure. Refactor:
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

  'transcripts:read': ['Integration'] as Role[],
  'summaries:write': ['Integration'] as Role[],
} as const;

type StringKeys<objType extends {}> = Array<Extract<keyof objType, string>>

export type Resource = ArrayElement<StringKeys<typeof ACL>>;

export function isPermitted(userRoles : Role[], resourceRole: Role) {
  return resourceRole === 'Anyone' || userRoles.includes(resourceRole); 
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
