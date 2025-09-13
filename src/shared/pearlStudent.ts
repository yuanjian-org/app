import Role from "./Role";

/**
 * A user can validate themselves as a pearl student only if they have no roles
 * or the only role is "Mentee". The latter may happen if they've applied for
 * relational mentorship through Yuanjian mentee application form.
 */
export function canValidatePearlStudent(myRoles: Role[]) {
  // Force type check
  const mentee: Role = "Mentee";
  return myRoles.filter((r) => r !== mentee).length == 0;
}
