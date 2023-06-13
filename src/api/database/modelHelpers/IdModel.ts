import {
  CreatedAt,
  UpdatedAt,
  Column,
  PrimaryKey,
  IsUUID,
  DataType,
  Default,
} from "sequelize-typescript";
import BaseModel from "./BaseModel";
import { CreationOptional } from "sequelize";

class IdModel<TModelAttributes extends {}, TCreationAttributes extends {}> extends BaseModel<
  TModelAttributes,
  TCreationAttributes
> {
  @IsUUID(4)
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: CreationOptional<string>;

  @CreatedAt
  createdAt: CreationOptional<Date>;

  @UpdatedAt
  updatedAt: CreationOptional<Date>;
}

export default IdModel;
