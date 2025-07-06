import sequelize, { ModelAttributeColumnOptions } from "sequelize";

import { addAttribute } from "sequelize-typescript/dist/model/column/attribute-service";
import { getSequelizeTypeByDesignType } from "sequelize-typescript/dist/model/shared/model-service";
import { isDataType } from "sequelize-typescript/dist/sequelize/data-type/data-type-service";
import z, { ZodError, ZodTypeAny } from "zod";
import { Model } from "sequelize-typescript";

type OptionsOrDataType =
  | Partial<ModelAttributeColumnOptions>
  | sequelize.DataType;

export class ZodColumnGetError extends Error {
  constructor(propertyName: string, val: any, zodError: ZodError) {
    const msg = `get ${propertyName} = ${JSON.stringify(val)}, got error ${zodError.toString()}`;
    super(msg);
  }
}

export class ZodColumnSetError extends Error {
  constructor(propertyName: string, val: any, zodError: ZodError) {
    const msg = `set ${propertyName} = ${JSON.stringify(val)}, got error ${zodError.toString()}`;
    super(msg);
  }
}

// from https://github.com/sequelize/sequelize-typescript/blob/master/src/model/column/column.ts
export default function ZodColumn(
  optionsOrDataType: OptionsOrDataType,
  zodType: ZodTypeAny,
) {
  return (
    target: any,
    propertyName: string,
    propertyDescriptor?: PropertyDescriptor,
  ) => {
    annotate(
      optionsOrDataType,
      zodType,
      target,
      propertyName,
      propertyDescriptor ??
        Object.getOwnPropertyDescriptor(target, propertyName),
    );
  };
}

function annotate(
  optionsOrDataType: OptionsOrDataType,
  zodType: ZodTypeAny,
  target: any,
  propertyName: string,
  propertyDescriptor?: PropertyDescriptor,
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

  const originalGet = propertyDescriptor?.get;
  const originalSet = propertyDescriptor?.set;

  // skip it in production
  if (process.env.NODE_ENV === "production") {
    if (originalGet) options.get = originalGet;
    if (originalSet) options.set = originalSet;
    addAttribute(target, propertyName, options);
    return;
  }

  if (zodType) {
    options.get = function () {
      // console.log('this._options', this._options);
      let finalZodType = zodType;
      // @ts-expect-error
      if (this._options._isPartial) {
        finalZodType = z.optional(zodType);
      }
      const val = this.getDataValue(propertyName); // TODO how to call original property descriptor?
      const parsed = finalZodType.safeParse(val);
      if (parsed.success === true) {
        return parsed.data;
      } else {
        throw new ZodColumnGetError(propertyName, val, parsed.error);
      }
    };
    options.set = function (val: any) {
      const parsed = zodType.safeParse(val);
      if (parsed.success === true) {
        this.setDataValue(propertyName, parsed.data); // TODO how to call original property descriptor?
      } else {
        throw new ZodColumnSetError(propertyName, val, parsed.error);
      }
    };
  } else {
    if (originalGet) options.get = originalGet;
    if (originalSet) options.set = originalSet;
  }

  addAttribute(target, propertyName, options);
}

// Model.update may construct a partial model, causing zod validation failure.
// original code: https://github.com/sequelize/sequelize/blob/main/src/model.js
export const hookIsPartialAfterSequelizeInit = () => {
  const originalUpdate = Model.update;
  // @ts-expect-error
  Model.update = function (values, ...args) {
    // console.log("Model.update", values, ...args);
    // @ts-expect-error
    values._isPartial = true;
    return originalUpdate.call(this, values, ...args);
  };

  const originalBuild = Model.build;
  // @ts-expect-error
  Model.build = function (values, options) {
    // console.log("Model.build", values, options);
    // @ts-expect-error
    if (values._isPartial) {
      // @ts-expect-error
      delete values._isPartial;
      options = options || {};
      // @ts-expect-error
      options._isPartial = true;
    }
    return originalBuild.call(this, values, options);
  };
};
