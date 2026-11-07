import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { insertOneOnOneMessagePrefixImpl } from "./chatsInternal";
import { saveDraftMessageImpl } from "./chats";
import { oneOnOneMessagePrefix } from "shared/ChatMessage";

describe("insertOneOnOneMessagePrefixImpl", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  async function createTestMessage(markdown: string) {
    const mentee = await db.User.create(
      {
        email: `test-mentee-${Date.now()}@test.com`,
        name: "Test Mentee",
        roles: ["Mentee"],
      },
      { transaction },
    );

    const room = await db.ChatRoom.create(
      {
        menteeId: mentee.id,
      },
      { transaction },
    );

    const message = await db.ChatMessage.create(
      {
        roomId: room.id,
        userId: mentee.id,
        markdown,
      },
      { transaction },
    );

    return message;
  }

  it("should add one-on-one prefix to message markdown", async () => {
    const originalMarkdown = "This is a test message";
    const message = await createTestMessage(originalMarkdown);

    await insertOneOnOneMessagePrefixImpl(message.id, transaction);

    const updatedMessage = await db.ChatMessage.findByPk(message.id, {
      transaction,
    });

    expect(updatedMessage?.markdown).to.equal(
      oneOnOneMessagePrefix + originalMarkdown,
    );
  });

  it("should throw error if message already has a prefix", async () => {
    const message = await createTestMessage(
      oneOnOneMessagePrefix + "This already has a prefix",
    );

    let errorThrown = false;
    try {
      await insertOneOnOneMessagePrefixImpl(message.id, transaction);
    } catch (error) {
      errorThrown = true;
      void expect(error).to.have.property("message", "消息已包含前缀");
    }

    void expect(errorThrown).to.be.true;
  });
});

describe("saveDraftMessageImpl", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  it("should not overwrite another user's draft in the same room", async () => {
    const user1 = await db.User.create(
      {
        email: `draft-user1-${Date.now()}@test.com`,
        name: "Draft User 1",
        roles: ["Mentee"],
      },
      { transaction },
    );
    const user2 = await db.User.create(
      {
        email: `draft-user2-${Date.now()}@test.com`,
        name: "Draft User 2",
        roles: ["Mentor"],
      },
      { transaction },
    );
    const room = await db.ChatRoom.create(
      {
        menteeId: user1.id,
      },
      { transaction },
    );

    // Both users save an initial draft in the same room.
    await saveDraftMessageImpl(
      user1.id,
      room.id,
      undefined,
      "User 1 initial draft",
      transaction,
    );
    await saveDraftMessageImpl(
      user2.id,
      room.id,
      undefined,
      "User 2 initial draft",
      transaction,
    );

    // User 2 updates their existing draft in the room.
    await saveDraftMessageImpl(
      user2.id,
      room.id,
      undefined,
      "User 2 updated draft",
      transaction,
    );

    const user1Draft = await db.DraftMessage.findOne({
      where: { authorId: user1.id, chatRoomId: room.id },
      transaction,
    });
    const user2Draft = await db.DraftMessage.findOne({
      where: { authorId: user2.id, chatRoomId: room.id },
      transaction,
    });

    expect(user1Draft?.markdown).to.equal("User 1 initial draft");
    expect(user2Draft?.markdown).to.equal("User 2 updated draft");
  });
});
