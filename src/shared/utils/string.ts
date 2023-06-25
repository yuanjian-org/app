export const stringOrEmpty = (value: string | undefined) => {
  return value ? value : ''
};

// /**
//  * Convert a string to a boolean. Supports the following:
//  *
//  * 0 = false
//  * 1 = true
//  * "true" = true
//  * "false" = false
//  * "" = false
//  *
//  * @param value The string to convert
//  * @returns A boolean
//  */
// export const toBoolean = (value: string) => {
//   return value ? !!JSON.parse(value) : false;
// }

export function capitalizeFirstChar(str : string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
