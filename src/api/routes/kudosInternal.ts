/**
 * Seperate these functions from chats.ts to avoid build errors when running
 * `yarn gen-demo-data`.
 */

import db from "../database/db";
import { generalBadRequestError, notFoundError } from "../errors";
import { Transaction } from "sequelize";

/**
 * @param text null means like, non-null means kudos.
 */
export default async function createKudos(
  giverId: string,
  receiverId: string,
  text: string | null,
  transaction: Transaction,
) {
  if (receiverId === giverId) {
    throw generalBadRequestError("User cannot send kudos to themselves");
  }

  // Can't use db.User.increment because it doesn't support incrementing a
  // null field.
  let user;
  try {
    user = await db.User.findByPk(receiverId, {
      attributes: ["id", "likes", "kudos"],
      transaction,
    });
  } catch (error: any) {
    if (
      error.name === "SequelizeDatabaseError" &&
      error.parent?.code === "22P02"
    ) {
      // invalid input syntax for type uuid
      throw notFoundError("用户", receiverId);
    }
    throw error;
  }
  if (!user) throw notFoundError("用户", receiverId);

  await db.Kudos.create(
    {
      receiverId,
      giverId,
      text,
    },
    { transaction },
  );

  await user.update(
    {
      ...(text === null
        ? { likes: user.likes + 1 }
        : { kudos: user.kudos + 1 }),
    },
    { transaction },
  );
}
