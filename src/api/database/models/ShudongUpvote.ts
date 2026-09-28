import {
  Column,
  Table,
  Model,
  ForeignKey,
  BelongsTo,
  Default,
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
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
    primaryKey: true,
  })
  id: string;

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
