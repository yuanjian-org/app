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
      fields: ["postId", "userId"],
      unique: true,
    },
  ],
})
class ShudongUpvote extends Model {
  @ForeignKey(() => ShudongPost)
  @AllowNull(false)
  @Column(DataType.UUID)
  postId: string;

  @BelongsTo(() => ShudongPost, "postId")
  post: ShudongPost;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => User, "userId")
  user: User;
}

export default ShudongUpvote;
