import {
  Column,
  ForeignKey,
  Table,
  BelongsTo,
  Model,
  PrimaryKey,
  IsUUID,
  Default,
  HasMany,
} from "sequelize-typescript";
import { CreationOptional, UUID, UUIDV4 } from "sequelize";
import User from "./User";
import Assessment from "./Assessment";

/**
 * A partnership is a mentee-mentor pair
 */
@Table({
  paranoid: true,
  indexes: [{
    unique: true,
    fields: ['mentorId', 'menteeId']
  }]
})
class Partnership extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Default(UUIDV4)
  @Column(UUID)
  id: CreationOptional<string>;

  @ForeignKey(() => User)
  @Column(UUID)
  mentorId: string;

  @BelongsTo(() => User, { foreignKey: 'mentorId' })
  mentor: User;

  @ForeignKey(() => User)
  @Column(UUID)
  menteeId: string;

  @BelongsTo(() => User, { foreignKey: 'menteeId' })
  mentee: User;

  @HasMany(() => Assessment)
  assessments: Assessment[];
}

export default Partnership;
