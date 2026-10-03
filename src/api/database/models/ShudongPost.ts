import {
  Column,
  Table,
  Model,
  ForeignKey,
  BelongsTo,
  AllowNull,
  Default,
  DataType,
  Index,
} from "sequelize-typescript";
import User from "./User";

@Table
class ShudongPost extends Model {
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
    primaryKey: true,
  })
  id: string;

  /**
   * parentId is null for root questions, and non-null for responses/replies.
   */
  @Index
  @ForeignKey(() => ShudongPost)
  @Column(DataType.UUID)
  parentId: string | null;

  @BelongsTo(() => ShudongPost, "parentId")
  parent: ShudongPost | null;

  /**
   * authorId is null if the post was created anonymously when
   * shudongRecordAnonymousUserId is disabled.
   */
  @Index
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

  @Column(DataType.DATE)
  lastEditedAt: Date | null;

  @Column(DataType.DATE)
  deletedAt: Date | null;

  @Index
  @Column(DataType.DATE)
  createdAt: Date;
}

export default ShudongPost;
