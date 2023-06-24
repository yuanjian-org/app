import { ArrayElement } from "./utils/ArrayElement";
import z from "zod";

export type Role = ArrayElement<typeof ALL_ROLES>;

export const ALL_ROLES = [
  'ADMIN',
  'VISITOR',
  'INTEGRATION',
] as const;

export const zRoleArr = z.array(z.enum(ALL_ROLES));

export const RBAC_DEF = {
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

export const ALL_RESOURCES = Object.keys(RBAC_DEF) as StringKeys<typeof RBAC_DEF>;

export type Resource = ArrayElement<StringKeys<typeof RBAC_DEF>>;

export const isPermitted = (roles: Role[], resource: Resource) => {
  for (const r of roles) {
    if (RBAC_DEF[resource].includes(r)) {
      return true;
    }
  }

  return false;
}
