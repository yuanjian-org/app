import Role from "./Role";

/**
 * A user can validate themselves as a pearl student only if they have no roles.
 */
export function canValidatePearlStudent(myRoles: Role[]) {
  return myRoles.length == 0;
}
