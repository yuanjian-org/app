import {
  Column,
  Table,
  Model,
  ForeignKey,
  BelongsTo,
  AllowNull,
  Default,
  DataType,
} from "sequelize-typescript";
import User from "./User";

@Table({
  indexes: [
    { fields: ["parentId"] },
    { fields: ["authorId"] },
    { fields: ["createdAt"] },
  ],
})
class ShudongPost extends Model {
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
    primaryKey: true,
  })
  id: string;

  @ForeignKey(() => ShudongPost)
  @Column(DataType.UUID)
  parentId: string | null;

  @BelongsTo(() => ShudongPost, "parentId")
  parent: ShudongPost | null;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  authorId: string | null;

  @BelongsTo(() => User, "authorId")
  author: User | null;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isAnonymous: boolean;

  @AllowNull(false)
  @Column(DataType.TEXT)
  markdown: string;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  upvoteCount: number;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  responseCount: number;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isEdited: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isDeleted: boolean;

  @Column(DataType.DATE)
  deletedAt: Date | null;
}

export default ShudongPost;
