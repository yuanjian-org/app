import {
  Column,
  Table,
  Model,
  ForeignKey,
  BelongsTo,
  DataType,
  AllowNull,
} from "sequelize-typescript";
import User from "./User";
import ShudongPost from "./ShudongPost";

@Table({
  indexes: [
    {
      fields: ["questionId", "userId"],
      unique: true,
    },
  ],
})
class ShudongSubscription extends Model {
  @ForeignKey(() => ShudongPost)
  @AllowNull(false)
  @Column(DataType.UUID)
  questionId: string;

  @BelongsTo(() => ShudongPost, "questionId")
  question: ShudongPost;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => User, "userId")
  user: User;
}

export default ShudongSubscription;
