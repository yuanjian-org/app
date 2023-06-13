import { addAttributeOptions } from "sequelize-typescript";

export default function IsOneOf({
  msg,
  list,
}: {
  msg?: string;
  list: any[] | readonly any[];
}): (target: any, propertyName: string) => void {
  return (target: any, propertyName: string) =>
    addAttributeOptions(target, propertyName, {
      validate: {
        validOneOf(value: string) {
          if (list.indexOf(value) < 0) {
            throw new Error(msg);
          }
        },
      },
    });
}
