import sequelize, { ModelAttributeColumnOptions } from "sequelize";
import { getSequelizeTypeByDesignType } from "sequelize-typescript/dist/model/shared/model-service";
import { isDataType } from "sequelize-typescript/dist/sequelize/data-type/data-type-service";

export type OptionsOrDataType =
  | Partial<ModelAttributeColumnOptions>
  | sequelize.DataType;

export function getOptions(
  optionsOrDataType: OptionsOrDataType,
  target: any,
  propertyName: string,
): Partial<ModelAttributeColumnOptions> {
  let options: Partial<ModelAttributeColumnOptions>;

  if (isDataType(optionsOrDataType)) {
    options = {
      type: optionsOrDataType,
    };
  } else {
    options = { ...(optionsOrDataType as ModelAttributeColumnOptions) };

    if (!options.type) {
      options.type = getSequelizeTypeByDesignType(target, propertyName);
    }
  }

  return options;
}
