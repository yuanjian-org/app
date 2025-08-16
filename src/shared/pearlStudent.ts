import Role from "./Role";

export function canValidatePearlStudent(myRoles: Role[]) {
  return myRoles.length == 0;
}
