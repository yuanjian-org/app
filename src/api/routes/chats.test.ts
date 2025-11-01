import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { insertOneOnOneMessagePrefixImpl } from "./chatsInternal";
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
