import {
  Column,
  ForeignKey,
  Model,
  Default,
  IsUUID,
  Unique,
  PrimaryKey,
} from "sequelize-typescript";
import { CreationOptional, UUID, UUIDV4 } from "sequelize";
import Org from "./Org";

class OrgUserRole extends Model {
  @Unique
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  @ForeignKey(() => Org)
  @Column(UUID)
  orgId: string;
}

export default OrgUserRole;
