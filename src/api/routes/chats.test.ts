import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { insertOneOnOneMessagePrefixImpl } from "./chatsInternal";
import { oneOnOneMessagePrefix } from "shared/ChatMessage";
import {
  getLastMessageCreatedAtImpl,
  getLastMessageUpdatedAtImpl,
  getLastReadAtImpl,
  setLastReadAtImpl,
  createMessageAndScheduleEmail,
  updateMessageImpl,
  updateMessageCreationTimeImpl,
  saveDraftMessageImpl,
  getDraftMessageImpl,
} from "./chats";
import { findOrCreateRoom } from "./chatsInternal";
import User from "../../shared/User";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import * as scheduledNotifications from "./scheduledNotifications";
import sinon from "sinon";

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

describe("chats tests", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    sinon.restore();
    if (transaction) {
      await transaction.rollback();
    }
  });

  async function createTestUser(roles: any[] = []): Promise<User> {
    const user = await db.User.create(
      {
        email: `test-user-${uuidv4()}@test.com`,
        name: "Test User",
        roles,
      },
      { transaction },
    );
    return user.toJSON() as User;
  }

  describe("getLastMessageCreatedAtImpl", () => {
    it("should return null if room does not exist", async () => {
      const res = await getLastMessageCreatedAtImpl(uuidv4(), "", transaction);
      expect(res).to.be.null;
    });

    it("should return correct max createdAt when messages exist", async () => {
      const mentee = await createTestUser();
      const room = await findOrCreateRoom(
        mentee,
        mentee.id,
        "write",
        transaction,
      );

      const now = moment().toDate();
      const old = moment().subtract(1, "day").toDate();

      await db.ChatMessage.create(
        {
          roomId: room.id,
          userId: mentee.id,
          markdown: "old msg",
          createdAt: old,
        },
        { transaction },
      );

      await db.ChatMessage.create(
        {
          roomId: room.id,
          userId: mentee.id,
          markdown: "new msg",
          createdAt: now,
        },
        { transaction },
      );

      const res = await getLastMessageCreatedAtImpl(mentee.id, "", transaction);
      expect(res).to.not.be.null;
      expect(moment(res).isAfter(old)).to.be.true;
    });

    it("should handle prefix filtering", async () => {
      const mentee = await createTestUser();
      const room = await findOrCreateRoom(
        mentee,
        mentee.id,
        "write",
        transaction,
      );
      await db.ChatMessage.create(
        {
          roomId: room.id,
          userId: mentee.id,
          markdown: "msg",
        },
        { transaction },
      );

      const res = await getLastMessageCreatedAtImpl(
        mentee.id,
        "PREFIX",
        transaction,
      );
      expect(res).to.be.null;
    });
  });

  describe("getLastMessageUpdatedAtImpl", () => {
    it("should return null if room does not exist", async () => {
      const user = await createTestUser();
      const res = await getLastMessageUpdatedAtImpl(
        user,
        uuidv4(),
        transaction,
      );
      expect(res).to.be.null;
    });

    it("should return max updatedAt ignoring current user messages", async () => {
      const mentee = await createTestUser();
      const otherUser = await createTestUser();
      const room = await findOrCreateRoom(
        mentee,
        mentee.id,
        "write",
        transaction,
      );

      const old = moment().subtract(1, "day").toDate();
      const now = moment().toDate();

      await db.ChatMessage.create(
        {
          roomId: room.id,
          userId: otherUser.id,
          markdown: "old msg",
          createdAt: old,
          updatedAt: old,
        },
        { transaction },
      );

      await db.ChatMessage.create(
        {
          roomId: room.id,
          userId: mentee.id,
          markdown: "new msg",
          createdAt: now,
          updatedAt: now,
        },
        { transaction },
      );

      const res = await getLastMessageUpdatedAtImpl(
        mentee,
        mentee.id,
        transaction,
      );
      expect(res).to.not.be.null;
      // Should match otherUser's message
      expect(moment(res).isSame(moment(old))).to.be.true;
    });
  });

  describe("getLastReadAtImpl and setLastReadAtImpl", () => {
    it("should default to 0 epoch if room doesn't exist", async () => {
      const mentee = await createTestUser();
      const res = await getLastReadAtImpl(mentee, uuidv4(), transaction);
      expect(res.valueOf()).to.equal(moment(0).valueOf());
    });

    it("should read 0 epoch if never set", async () => {
      const mentee = await createTestUser();
      await findOrCreateRoom(mentee, mentee.id, "write", transaction);
      const res = await getLastReadAtImpl(mentee, mentee.id, transaction);
      expect(res.valueOf()).to.equal(moment(0).valueOf());
    });

    it("should set and read successfully", async () => {
      const mentee = await createTestUser();
      await findOrCreateRoom(mentee, mentee.id, "write", transaction);

      const setTime = moment().toDate();
      await setLastReadAtImpl(mentee, mentee.id, setTime, transaction);

      const res = await getLastReadAtImpl(mentee, mentee.id, transaction);
      expect(moment(res).valueOf()).to.equal(moment(setTime).valueOf());
    });

    it("should throw error when setting for non-existent room", async () => {
      const mentee = await createTestUser();
      try {
        await setLastReadAtImpl(mentee, uuidv4(), new Date(), transaction);
        expect.fail();
      } catch (e: any) {
        expect(e.message).to.include("讨论空间");
      }
    });
  });

  describe("createMessageAndScheduleEmail", () => {
    it("should create message and schedule email", async () => {
      const scheduleStub = sinon
        .stub(scheduledNotifications, "scheduleNotification")
        .resolves();

      const mentee = await createTestUser();
      const room = await findOrCreateRoom(
        mentee,
        mentee.id,
        "write",
        transaction,
      );

      await createMessageAndScheduleEmail(
        mentee,
        room.id,
        "hello",
        transaction,
      );

      const msgs = await db.ChatMessage.findAll({
        where: { roomId: room.id },
        transaction,
      });
      expect(msgs.length).to.equal(1);
      expect(msgs[0].markdown).to.equal("hello");

      void expect(scheduleStub.calledOnce).to.be.true;
    });
  });

  describe("updateMessageImpl", () => {
    it("should update message successfully", async () => {
      sinon.stub(scheduledNotifications, "scheduleNotification").resolves();
      const mentee = await createTestUser();
      const room = await findOrCreateRoom(
        mentee,
        mentee.id,
        "write",
        transaction,
      );

      const msg = await db.ChatMessage.create(
        {
          roomId: room.id,
          userId: mentee.id,
          markdown: "old msg",
        },
        { transaction },
      );

      await updateMessageImpl(mentee, msg.id, "new msg", transaction);

      const updated = await db.ChatMessage.findByPk(msg.id, { transaction });
      expect(updated?.markdown).to.equal("new msg");
    });

    it("should throw on empty string", async () => {
      const mentee = await createTestUser();
      try {
        await updateMessageImpl(mentee, "foo", "   ", transaction);
        expect.fail();
      } catch (e: any) {
        expect(e.message).to.include("内容不能为空");
      }
    });

    it("should throw if no permission", async () => {
      const mentee = await createTestUser();
      const other = await createTestUser();
      const room = await findOrCreateRoom(
        mentee,
        mentee.id,
        "write",
        transaction,
      );

      const msg = await db.ChatMessage.create(
        {
          roomId: room.id,
          userId: mentee.id,
          markdown: "old msg",
        },
        { transaction },
      );

      try {
        await updateMessageImpl(other, msg.id, "new msg", transaction);
        expect.fail();
      } catch (e: any) {
        expect(e.message).to.include("讨论消息");
      }
    });
  });

  describe("updateMessageCreationTimeImpl", () => {
    it("should update createdAt", async () => {
      const mentee = await createTestUser();
      const room = await findOrCreateRoom(
        mentee,
        mentee.id,
        "write",
        transaction,
      );

      const msg = await db.ChatMessage.create(
        {
          roomId: room.id,
          userId: mentee.id,
          markdown: "old msg",
        },
        { transaction },
      );

      const newDate = moment().subtract(5, "days").toDate();
      await updateMessageCreationTimeImpl(msg.id, newDate, transaction);

      const updated = await db.ChatMessage.findByPk(msg.id, { transaction });
      expect(moment(updated?.createdAt).valueOf()).to.equal(
        moment(newDate).valueOf(),
      );
    });
  });

  describe("saveDraftMessageImpl and getDraftMessageImpl", () => {
    it("should return null if no draft", async () => {
      const mentee = await createTestUser();
      const res = await getDraftMessageImpl(
        mentee,
        uuidv4(),
        undefined,
        transaction,
      );
      expect(res).to.be.null;
    });

    it("should save and get draft correctly using roomId", async () => {
      const mentee = await createTestUser();
      const room = await findOrCreateRoom(
        mentee,
        mentee.id,
        "write",
        transaction,
      );

      await saveDraftMessageImpl(
        mentee,
        "draft 1",
        transaction,
        room.id,
        undefined,
      );
      let res = await getDraftMessageImpl(
        mentee,
        room.id,
        undefined,
        transaction,
      );
      expect(res).to.equal("draft 1");

      await saveDraftMessageImpl(
        mentee,
        "draft 2",
        transaction,
        room.id,
        undefined,
      );
      res = await getDraftMessageImpl(mentee, room.id, undefined, transaction);
      expect(res).to.equal("draft 2");
    });

    it("should save and get draft correctly using messageId", async () => {
      const mentee = await createTestUser();
      const msgId = uuidv4();

      await saveDraftMessageImpl(
        mentee,
        "draft A",
        transaction,
        undefined,
        msgId,
      );
      let res = await getDraftMessageImpl(
        mentee,
        undefined,
        msgId,
        transaction,
      );
      expect(res).to.equal("draft A");

      await saveDraftMessageImpl(
        mentee,
        "draft B",
        transaction,
        undefined,
        msgId,
      );
      res = await getDraftMessageImpl(mentee, undefined, msgId, transaction);
      expect(res).to.equal("draft B");
    });
  });
});
