/**
 * Seperate these functions from chats.ts to avoid build errors when running
 * `yarn gen-demo-data`.
 */

import db from "../database/db";
import { generalBadRequestError, notFoundError } from "../errors";
import { Includeable, Transaction } from "sequelize";
import User from "../../shared/User";
import { checkPermissionToAccessMentee } from "./users";
import invariant from "../../shared/invariant";
import {
  chatRoomAttributes,
  chatRoomInclude,
} from "../database/models/attributesAndIncludes";
import { zChatRoom, ChatRoom } from "../../shared/ChatRoom";
import { typedMessagePrefix, oneOnOneMessagePrefix } from "shared/ChatMessage";

export async function findOrCreateRoom(
  me: User,
  menteeId: string,
  action: "read" | "write",
  transaction: Transaction,
): Promise<ChatRoom> {
  await checkRoomPermission(me, menteeId, action, transaction);

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
) {
  const r = await db.ChatRoom.findByPk(roomId, {
    attributes: ["menteeId"],
    transaction,
  });
  if (!r) throw notFoundError("讨论空间", roomId);

  await checkRoomPermission(author, r.menteeId, "write", transaction);

  const trimmed = markdown.trim();
  if (!trimmed) throw generalBadRequestError("内容不能为空");

  await db.ChatMessage.create(
    { roomId, markdown: trimmed, userId: author.id },
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
  action: "read" | "write" | "readMetadata",
  transaction: Transaction,
) {
  if (menteeId !== null) {
    // Allow the mentee to write to their own room.
    if (action === "write" && me.id === menteeId) return;
    await checkPermissionToAccessMentee(
      me,
      menteeId,
      transaction,
      action == "readMetadata" ? "readMetadata" : "any",
    );
  } else invariant(false, "Unexpectedchat room type");
}

export async function insertOneOnOneMessagePrefixImpl(
  messageId: string,
  transaction: Transaction,
) {
  const m = await db.ChatMessage.findByPk(messageId, {
    attributes: ["id", "markdown"],
    include: [
      {
        association: "room",
        attributes: ["menteeId"],
      },
    ],
    transaction,
  });
  if (!m) throw notFoundError("讨论消息", messageId);
  if (!m.room.menteeId) throw generalBadRequestError("非导师内部讨论空间");
  if (m.markdown.startsWith(typedMessagePrefix)) {
    throw generalBadRequestError("消息已包含前缀");
  }
  await m.update(
    { markdown: oneOnOneMessagePrefix + m.markdown },
    { transaction },
  );
}
