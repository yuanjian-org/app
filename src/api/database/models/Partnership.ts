import {
  Column,
  ForeignKey,
  Table,
  BelongsTo,
  Model,
  PrimaryKey,
} from "sequelize-typescript";
import { UUID } from "sequelize";
import User from "./User";

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
  @PrimaryKey
  @ForeignKey(() => User)
  @Column(UUID)
  mentorId: string;

  @BelongsTo(() => User, { foreignKey: 'mentorId' })
  mentor: User;

  @PrimaryKey
  @ForeignKey(() => User)
  @Column(UUID)
  menteeId: string;

  @BelongsTo(() => User, { foreignKey: 'menteeId' })
  mentee: User;
}

export default Partnership;
