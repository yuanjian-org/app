import { DeletedAt } from "sequelize-typescript";
import IdModel from "./IdModel";

class ParanoidModel<TModelAttributes extends {}, TCreationAttributes extends {}> extends IdModel<
  TModelAttributes,
  TCreationAttributes
> {
  @DeletedAt
  deletedAt: Date | null;
}

export default ParanoidModel;
