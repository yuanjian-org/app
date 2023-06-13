import sequelize, { ModelAttributeColumnOptions } from "sequelize";

import { addAttribute } from "sequelize-typescript/dist/model/column/attribute-service";
import { getSequelizeTypeByDesignType } from "sequelize-typescript/dist/model/shared/model-service";
import { isDataType } from "sequelize-typescript/dist/sequelize/data-type/data-type-service";

// from https://github.com/sequelize/sequelize-typescript/blob/master/src/model/column/column.ts
export function ColumnForAll(dataType: sequelize.DataType) {
  return (
    target: any,
    propertyName: string,
    propertyDescriptor?: PropertyDescriptor
  ) => {
    annotate(
      target,
      propertyName,
      propertyDescriptor ??
        Object.getOwnPropertyDescriptor(target, propertyName),
      dataType
    );
  };
}

function annotate(
  target: any,
  propertyName: string,
  propertyDescriptor?: PropertyDescriptor,
  optionsOrDataType:
    | Partial<ModelAttributeColumnOptions>
    | sequelize.DataType = {}
): void {
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

  // const desc = Object.getOwnPropertyDescriptor(
  //   target.prototype || {},
  //   propertyName
  // );
  //
  // const desc2 = Object.getOwnPropertyDescriptor(target || {}, propertyName);
  //
  // console.log("ColumnForAll", propertyName, desc, desc2);

  if (
    // QUESTION ONJSONB supported in sqlite3?
    // value instanceof sequelize.DataTypes.JSONB ||
    options.type instanceof sequelize.DataTypes.ARRAY
  ) {
    // console.log(this, target, propertyName, optionsOrDataType);
    options.type = sequelize.DataTypes.TEXT;
    options.get = function () {
      try {
        // console.log("getting " + propertyName);
        const val = this.getDataValue(propertyName);
        if (!val) {
          // undefined, null, 0, ""
          return [];
        }
        return JSON.parse(val);
      } catch (err) {
        console.log(err);
        return [];
      }
    };
    options.set = function (val: any) {
      if (!Array.isArray(val)) {
        throw new Error(
          "setting " + propertyName + "=" + val + ": not an array"
        );
      }
      // console.log("setting " + propertyName, val);
      this.setDataValue(propertyName, JSON.stringify(val));
    };
    options.validate = {
      // isArray: true,
    };
  } else {
    if (propertyDescriptor) {
      if (propertyDescriptor.get) {
        options.get = propertyDescriptor.get;
      }
      if (propertyDescriptor.set) {
        options.set = propertyDescriptor.set;
      }
    }
  }

  addAttribute(target, propertyName, options);
}
