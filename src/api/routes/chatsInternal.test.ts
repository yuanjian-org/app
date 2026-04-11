import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import {
  findOrCreateRoom,
  findRoom,
  createChatMessage,
  checkRoomPermission,
  insertOneOnOneMessagePrefixImpl,
} from "./chatsInternal";
import User from "../../shared/User";
import {
  oneOnOneMessagePrefix,
  typedMessagePrefix,
} from "../../shared/ChatMessage";

describe("chatsInternal", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  async function createTestUser(
    roles: any[] = [],
    menteeStatus: string | null = null,
  ) {
    const user = await db.User.create(
      {
        email: `test-user-${Date.now()}-${Math.random()}@test.com`,
        name: "Test User",
        roles,
        menteeStatus,
      },
      { transaction },
    );
    return {
      id: user.id,
      name: user.name,
      url: null,
      roles: user.roles,
      email: user.email,
      phone: user.phone,
      wechat: user.wechat,
      menteeStatus: user.menteeStatus,
      pointOfContact: null,
      pointOfContactNote: null,
    } as User;
  }

  describe("findOrCreateRoom", () => {
    it("should successfully create a room if it does not exist", async () => {
      const mentee = await createTestUser([], "现届学子");

      const room = await findOrCreateRoom(
        mentee,
        mentee.id,
        "write",
        transaction,
      );

      void expect(room).not.to.be.undefined;
      // ChatRoom zChatRoom might just have `menteeId` if it's minimal, let's verify what `room` actually contains.
      // Actually we know `foundRoom` has `id`. We can just test `foundRoom`'s `menteeId`.
      // Let's print the structure if needed or just use foundRoom.menteeId.

      // findRoom with only attributes: ["id"] by default.
      const foundRoom = await findRoom(mentee.id, transaction, [
        "id",
        "menteeId",
      ]);
      expect(foundRoom?.menteeId).to.equal(mentee.id);
      void expect(foundRoom).not.to.be.null;
      expect(foundRoom?.id).to.equal(room.id);
    });

    it("should return the existing room if it already exists", async () => {
      // Mentee reads their own room implies readMetadata for own room or full permission.
      // But read action on own room delegates to `checkPermissionToAccessMentee`.
      // Mentees don't have implicit read permission in `checkPermissionToAccessMentee` without proper role unless action="write"
      // Wait, checkRoomPermission: "Allow the mentee to write to their own room. if (action === 'write' && me.id === menteeId) return;"
      // If action='read', it calls checkPermissionToAccessMentee. A Mentee might not have permission.
      // We will make the user a MentorshipManager for "read" tests.
      const mentee = await createTestUser([], "现届学子");
      const manager = await createTestUser(["MentorshipManager"]);

      const createdRoom = await findOrCreateRoom(
        mentee,
        mentee.id,
        "write",
        transaction,
      );

      const roomAgain = await findOrCreateRoom(
        manager,
        mentee.id,
        "read",
        transaction,
      );

      expect(roomAgain.id).to.equal(createdRoom.id);
    });
  });

  describe("createChatMessage", () => {
    it("should successfully create a chat message and delete drafts", async () => {
      const mentee = await createTestUser([], "现届学子");
      const room = await findOrCreateRoom(
        mentee,
        mentee.id,
        "write",
        transaction,
      );

      // Create a draft first
      await db.DraftChatMessage.create(
        {
          roomId: room.id,
          authorId: mentee.id,
          markdown: "some draft",
        },
        { transaction },
      );

      await createChatMessage(mentee, room.id, "Hello world", transaction);

      const messageCount = await db.ChatMessage.count({
        where: { roomId: room.id, userId: mentee.id },
        transaction,
      });
      expect(messageCount).to.equal(1);

      const draftCount = await db.DraftChatMessage.count({
        where: { roomId: room.id, authorId: mentee.id },
        transaction,
      });
      expect(draftCount).to.equal(0);
    });

    it("should throw an error if the markdown is empty", async () => {
      const mentee = await createTestUser([], "现届学子");
      const room = await findOrCreateRoom(
        mentee,
        mentee.id,
        "write",
        transaction,
      );

      try {
        await createChatMessage(mentee, room.id, "   \n  ", transaction);
        expect.fail("Should have thrown an error");
      } catch (err: any) {
        expect(err.message).to.contain("内容不能为空");
      }
    });

    it("should throw an error if the room does not exist", async () => {
      const mentee = await createTestUser([], "现届学子");
      try {
        await createChatMessage(
          mentee,
          "00000000-0000-0000-0000-000000000000",
          "hello",
          transaction,
        );
        expect.fail("Should have thrown an error");
      } catch (err: any) {
        expect(err.message).to.contain("讨论空间");
      }
    });
  });

  describe("checkRoomPermission", () => {
    it("should allow a mentee to write to their own room", async () => {
      const mentee = await createTestUser([], "现届学子");
      // This shouldn't throw
      await checkRoomPermission(mentee, mentee.id, "write", transaction);
    });

    it("should throw error if user has no permission to read room", async () => {
      const mentee = await createTestUser([], "现届学子");
      const randomUser = await createTestUser([], null);

      try {
        await checkRoomPermission(randomUser, mentee.id, "read", transaction);
        expect.fail("Should have thrown an error");
      } catch (err: any) {
        expect(err.message).to.contain("没有权限访问学生");
      }
    });
  });

  describe("insertOneOnOneMessagePrefixImpl", () => {
    it("should successfully insert the one-on-one prefix to a message", async () => {
      const mentee = await createTestUser([], "现届学子");
      const room = await findOrCreateRoom(
        mentee,
        mentee.id,
        "write",
        transaction,
      );

      await createChatMessage(mentee, room.id, "Normal message", transaction);

      const message = await db.ChatMessage.findOne({
        where: { roomId: room.id },
        transaction,
      });

      await insertOneOnOneMessagePrefixImpl(message!.id, transaction);

      const updatedMessage = await db.ChatMessage.findByPk(message!.id, {
        transaction,
      });
      expect(updatedMessage?.markdown).to.equal(
        oneOnOneMessagePrefix + "Normal message",
      );
    });

    it("should throw an error if message already has a typed prefix", async () => {
      const mentee = await createTestUser([], "现届学子");
      const room = await findOrCreateRoom(
        mentee,
        mentee.id,
        "write",
        transaction,
      );

      await createChatMessage(
        mentee,
        room.id,
        typedMessagePrefix + "Normal message",
        transaction,
      );

      const message = await db.ChatMessage.findOne({
        where: { roomId: room.id },
        transaction,
      });

      try {
        await insertOneOnOneMessagePrefixImpl(message!.id, transaction);
        expect.fail("Should have thrown an error");
      } catch (err: any) {
        expect(err.message).to.contain("消息已包含前缀");
      }
    });

    it("should throw an error if message is not found", async () => {
      try {
        await insertOneOnOneMessagePrefixImpl(
          "00000000-0000-0000-0000-000000000000",
          transaction,
        );
        expect.fail("Should have thrown an error");
      } catch (err: any) {
        expect(err.message).to.contain("讨论消息");
      }
    });
  });
});
