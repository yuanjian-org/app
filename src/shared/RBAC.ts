import { ArrayElement } from "./utils/ArrayElement";
import z from "zod";

export type Role = ArrayElement<typeof ALL_ROLES>;

export const ALL_ROLES = [
  'ADMIN',
  'VISITOR'
] as const;

export const zRoleArr = z.array(z.enum(ALL_ROLES));

export const RBAC_DEF = {
  'home:read': ['ADMIN', 'VISITOR'] as Role[],
  'profile:read': ['ADMIN', 'VISITOR'] as Role[],
  'profile:write': ['ADMIN', 'VISITOR'] as Role[],
  'meeting:read': ['ADMIN', 'VISITOR'] as Role[], 
  'user-management:read': ['ADMIN'] as Role[],
  'user-management:write': ['ADMIN'] as Role[],
  'group-management:read': ['ADMIN'] as Role[],
  'group-management:write': ['ADMIN'] as Role[],
  'my-meetings:create': ['ADMIN', 'VISITOR'] as Role[],
  'my-meetings:read': ['ADMIN', 'VISITOR'] as Role[],
  'unknown': [] as Role[],
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
