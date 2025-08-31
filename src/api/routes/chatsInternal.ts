/**
 * Seperate these functions from chats.ts to avoid build errors when running
 * `yarn gen-demo-data`.
 */

import db from "../database/db";
import { notFoundError } from "../errors";
import { Includeable, Transaction } from "sequelize";
import User from "../../shared/User";
import { checkPermissionToAccessMentee } from "./users";
import invariant from "../../shared/invariant";
import {
  chatRoomAttributes,
  chatRoomInclude,
} from "../database/models/attributesAndIncludes";
import { zChatRoom, ChatRoom } from "../../shared/ChatRoom";

export async function findOrCreateRoom(
  me: User,
  menteeId: string,
  transaction: Transaction,
  allowMenteeForOwnRoom: boolean = false,
): Promise<ChatRoom> {
  await checkRoomPermission(me, menteeId, allowMenteeForOwnRoom);

  while (true) {
    const r = await findRoom(
      menteeId,
      transaction,
      chatRoomAttributes,
      chatRoomInclude,
    );
    if (!r) {
      await db.ChatRoom.create({ menteeId }, { transaction });
    } else {
      return zChatRoom.parse(r);
    }
  }
}

export async function findRoom(
  menteeId: string,
  transaction: Transaction,
  attributes: string[] = ["id"],
  include: Includeable[] = [],
) {
  return await db.ChatRoom.findOne({
    where: { menteeId },
    attributes,
    include,
    transaction,
  });
}

export async function createChatMessage(
  author: User,
  roomId: string,
  markdown: string,
  transaction: Transaction,
  allowMenteeForOwnRoom: boolean = false,
) {
  const r = await db.ChatRoom.findByPk(roomId, {
    attributes: ["menteeId"],
    transaction,
  });
  if (!r) throw notFoundError("讨论空间", roomId);

  await checkRoomPermission(author, r.menteeId, allowMenteeForOwnRoom);

  await db.ChatMessage.create(
    { roomId, markdown, userId: author.id },
    { transaction },
  );

  await db.DraftChatMessage.destroy({
    where: { roomId, authorId: author.id },
    transaction,
  });
}

export async function checkRoomPermission(
  me: User,
  menteeId: string | null,
  allowMenteeForOwnRoom: boolean = false,
) {
  if (menteeId !== null) {
    if (allowMenteeForOwnRoom && me.id === menteeId) return;
    await checkPermissionToAccessMentee(me, menteeId);
  } else invariant(false, "Unexpectedchat room type");
}
