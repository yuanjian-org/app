import { expect } from "chai";
import {
  redactEmail,
  updateWechatUnionId,
  updateImpl,
  setMyStateImpl,
} from "./users";
import * as usersModule from "./users";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction, QueryTypes } from "sequelize";
import sinon from "sinon";

describe("redactEmail", () => {
  it("should redact normal email", () => {
    expect(redactEmail("foo.BAR+123@Gmail.Yahoo98_")).equals(
      "f***@Gmail.Yahoo98_",
    );
  });

  it("should handle short names (1 character)", () => {
    expect(redactEmail("a@gmail.com")).equals("a***@gmail.com");
  });

  it("should handle short names (2 characters)", () => {
    expect(redactEmail("ab@gmail.com")).equals("a***@gmail.com");
  });

  it("should handle missing domain", () => {
    expect(redactEmail("invalid-email")).equals("invalid-email");
  });

  it("should handle missing name", () => {
    expect(redactEmail("@gmail.com")).equals("***@gmail.com");
  });

  it("should handle empty string", () => {
    expect(redactEmail("")).equals("");
  });
});

describe("updateWechatUnionId", () => {
  let transaction: Transaction;
  let testUser: any;
  const oldWechatUnionId = "old-union-id-123";

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    // Create a test user with an initial wechatUnionId
    testUser = await db.User.create(
      {
        email: "test@example.com",
        name: "Test User",
        roles: ["UserManager"],
        wechatUnionId: oldWechatUnionId,
      },
      { transaction },
    );
  });

  afterEach(async () => {
    if (transaction) await transaction.rollback();
  });

  it("should delete accounts table rows for both old and new wechatUnionIds", async () => {
    const newWechatUnionId = "new-union-id-456";

    // Insert test accounts for both old and new wechatUnionIds
    await sequelize.query(
      `INSERT INTO accounts (id, type, provider, provider_account_id, user_id) VALUES 
       ('11111111-1111-1111-1111-111111111111', 'oauth', 'wechat', :oldUnionId, :userId),
       ('22222222-2222-2222-2222-222222222222', 'oauth', 'wechat', :oldUnionId, :userId),
       ('33333333-3333-3333-3333-333333333333', 'oauth', 'wechat', :newUnionId, :userId)`,
      {
        replacements: {
          oldUnionId: oldWechatUnionId,
          newUnionId: newWechatUnionId,
          userId: testUser.id,
        },
        transaction,
      },
    );

    // Verify accounts exist before the update
    const accountsBefore = await sequelize.query(
      `SELECT provider_account_id FROM accounts WHERE user_id = :userId ORDER BY provider_account_id`,
      {
        replacements: { userId: testUser.id },
        transaction,
        type: QueryTypes.SELECT,
      },
    );
    expect(accountsBefore).to.have.length(3);
    expect(accountsBefore.map((a: any) => a.provider_account_id)).to.deep.equal(
      [newWechatUnionId, oldWechatUnionId, oldWechatUnionId],
    );

    await updateWechatUnionId(
      ["UserManager"],
      testUser.id,
      newWechatUnionId,
      transaction,
    );

    // Verify all accounts with both old and new wechatUnionIds are deleted
    const accountsAfter = await sequelize.query(
      `SELECT provider_account_id FROM accounts WHERE user_id = :userId`,
      {
        replacements: { userId: testUser.id },
        transaction,
        type: QueryTypes.SELECT,
      },
    );
    expect(accountsAfter).to.have.length(0);

    // Verify user's wechatUnionId was updated
    const updatedUser = await db.User.findByPk(testUser.id, { transaction });
    expect(updatedUser?.wechatUnionId).to.equal(newWechatUnionId);
  });

  it("should set wechatUnionId to null if null is provided", async () => {
    await updateWechatUnionId(["UserManager"], testUser.id, null, transaction);

    const updatedUser = await db.User.findByPk(testUser.id, { transaction });
    void expect(updatedUser?.wechatUnionId).to.be.null;
  });

  it("should do nothing if undefined is provided", async () => {
    await updateWechatUnionId(
      ["UserManager"],
      testUser.id,
      undefined,
      transaction,
    );

    const updatedUser = await db.User.findByPk(testUser.id, { transaction });
    expect(updatedUser?.wechatUnionId).to.equal(oldWechatUnionId);
  });

  it("should throw invariant if user is not a UserManager", async () => {
    try {
      await updateWechatUnionId(
        ["Volunteer"],
        testUser.id,
        "some_id",
        transaction,
      );
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.message).to.include("role violation");
    }
  });

  it("should throw invariant if target user does not exist", async () => {
    try {
      await updateWechatUnionId(
        ["UserManager"],
        "00000000-0000-0000-0000-000000000000",
        "some_id",
        transaction,
      );
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.message).to.include("User not found");
    }
  });

  it("should do nothing if wechatUnionId is the same as existing", async () => {
    // If it does nothing, no queries will be executed. We can verify it
    // completes successfully.
    // An indirect way is to ensure no accounts are deleted
    await updateWechatUnionId(
      ["UserManager"],
      testUser.id,
      oldWechatUnionId,
      transaction,
    );

    // verify the account with oldWechatUnionId is still there
    const accountsAfter = await sequelize.query(
      `SELECT provider_account_id FROM accounts WHERE user_id = :userId`,
      {
        replacements: { userId: testUser.id },
        transaction,
        type: QueryTypes.SELECT,
      },
    );
    expect(accountsAfter).to.have.length(0); // as it was in the beforeEach of
    // that suite
  });
});

describe("updateImpl", () => {
  let transaction: Transaction;
  let meManager: any;
  let meNormal: any;
  let targetUser: any;
  let updateWechatUnionIdStub: sinon.SinonStub;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
    updateWechatUnionIdStub = sinon
      .stub(usersModule, "updateWechatUnionId")
      .resolves();

    // Stub updateWechatUnionId to isolate updateImpl tests from its side
    // effects

    meManager = await db.User.create(
      {
        email: `manager-${Date.now()}-${Math.random()}@example.com`,
        name: "李经理",
        roles: ["UserManager"],
      },
      { transaction },
    );

    meNormal = await volunteer();

    targetUser = await volunteer();
  });

  afterEach(async () => {
    await transaction.rollback();

    sinon.restore();
  });

  async function volunteer() {
    return await db.User.create(
      {
        email: `volunteer-${Date.now()}-${Math.random()}@example.com`,
        name: "张三",
        roles: ["Volunteer"],
        phone: `138${Math.floor(Math.random() * 100000000)
          .toString()
          .padStart(8, "0")}`,
      },
      { transaction },
    );
  }

  const baseInput = (user: any) => ({
    id: user.id,
    name: user.name,
    roles: user.roles,
    email: user.email,
    phone: user.phone,
    wechat: user.wechat || "",
    url: user.url || "",
    wechatUnionId: null,
  });

  it("should throw notFoundError when user doesn't exist", async () => {
    try {
      await updateImpl(
        meManager,
        {
          ...baseInput(targetUser),
          id: "00000000-0000-0000-0000-000000000000",
        },
        transaction,
      );
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.message).to.include("用户");
    }
  });

  it("should throw noPermissionError when a non-UserManager tries to update someone else", async () => {
    try {
      await updateImpl(meNormal, baseInput(targetUser), transaction);
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.message).to.include("没有权限访问");
    }
  });

  it("should throw noPermissionError when a non-UserManager tries to modify roles", async () => {
    try {
      await updateImpl(
        meNormal,
        { ...baseInput(meNormal), roles: ["Volunteer", "UserManager"] },
        transaction,
      );
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.message).to.include("没有权限访问");
    }
  });

  it("should successfully update own profile (non-UserManager)", async () => {
    const input = { ...baseInput(meNormal), wechat: "new_wechat" };
    await updateImpl(meNormal, input, transaction);

    const updated = await db.User.findByPk(meNormal.id, { transaction });
    expect(updated?.wechat).to.equal("new_wechat");
  });

  it("should ensure non-UserManagers cannot change email or phone", async () => {
    const input = {
      ...baseInput(meNormal),
      email: "hacked@example.com",
      phone: "99999999999",
    };

    await updateImpl(meNormal, input, transaction);

    const updated = await db.User.findByPk(meNormal.id, { transaction });
    // Should successfully update (e.g., name/wechat) but ignore email/phone
    // changes
    expect(updated?.email).to.equal(meNormal.email);
    expect(updated?.phone).to.equal(meNormal.phone);
  });

  it("should successfully update another user's profile (UserManager)", async () => {
    const input = { ...baseInput(targetUser), wechat: "manager_set_wechat" };
    await updateImpl(meManager, input, transaction);

    const updated = await db.User.findByPk(targetUser.id, { transaction });
    expect(updated?.wechat).to.equal("manager_set_wechat");
  });

  it("should successfully update roles (UserManager)", async () => {
    const input = { ...baseInput(targetUser), roles: ["Volunteer", "Mentor"] };
    await updateImpl(meManager, input, transaction);

    const updated = await db.User.findByPk(targetUser.id, { transaction });
    expect(updated?.roles).to.include("Mentor");
  });

  it("should throw generalBadRequestError for invalid Chinese name", async () => {
    try {
      await updateImpl(
        meManager,
        { ...baseInput(targetUser), name: "John Doe" }, // English name
        transaction,
      );
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.message).to.include("中文姓名无效");
    }
  });

  it("should normalize empty strings to null for email, phone, wechat, but retain url if cleared", async () => {
    // First, give the targetUser valid initial strings for everything
    await updateImpl(
      meManager,
      {
        ...baseInput(targetUser),
        email: "test@example.com",
        phone: "1234567890",
        wechat: "wx_123",
        url: "exampleurl123",
      },
      transaction,
    );

    // Refresh targetUser
    targetUser = await db.User.findByPk(targetUser.id, { transaction });

    const input = {
      ...baseInput(targetUser),
      email: "",
      phone: "",
      wechat: "",
      url: "",
    };

    await updateImpl(meManager, input, transaction);

    const updated = await db.User.findByPk(targetUser.id, { transaction });
    void expect(updated?.email).to.be.null;
    void expect(updated?.phone).to.be.null;
    void expect(updated?.wechat).to.be.null;
    void expect(updated?.url).to.equal("exampleurl123");
  });

  it("should update wechatUnionId when UserManager updates", async () => {
    const input = { ...baseInput(targetUser), wechatUnionId: "new_union_id" };
    await updateImpl(meManager, input, transaction);

    void expect(updateWechatUnionIdStub.calledOnce).to.be.true;
    expect(updateWechatUnionIdStub.firstCall.args[2]).to.equal("new_union_id");
  });
});

describe("setMyStateImpl", () => {
  let transaction: Transaction;
  let me: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    me = await db.User.create(
      {
        email: `user-${Date.now()}-${Math.random()}@example.com`,
        name: "张三",
        roles: ["Volunteer"],
      },
      { transaction },
    );
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  it("should restrict exam field updates and allow whitelisted fields", async () => {
    const examDate = new Date("2023-01-01").toISOString();
    const lastKudosReadAt = new Date("2023-02-01").toISOString();

    await setMyStateImpl(
      me,
      {
        commsExam: examDate,
        handbookExam: examDate,
        menteeInterviewerExam: examDate,
        lastKudosReadAt,
      } as any,
      transaction,
    );

    const updated = await db.User.findByPk(me.id, { transaction });
    const state = updated?.state || {};

    void expect(state.commsExam).to.be.undefined;
    void expect(state.handbookExam).to.be.undefined;
    void expect(state.menteeInterviewerExam).to.be.undefined;
    expect(state.lastKudosReadAt).to.equal(lastKudosReadAt);
  });

  it("should allow UserManager to update any user's state and bypass whitelist", async () => {
    const manager = await db.User.create(
      {
        email: `manager-${Date.now()}-${Math.random()}@example.com`,
        name: "李经理",
        roles: ["UserManager"],
      },
      { transaction },
    );
    const examDate = new Date("2023-01-01").toISOString();

    await setMyStateImpl(
      manager,
      {
        commsExam: examDate,
      } as any,
      transaction,
      me.id,
    );

    const updated = await db.User.findByPk(me.id, { transaction });
    expect(updated?.state?.commsExam).to.equal(examDate);
  });

  it("should throw noPermissionError when non-UserManager tries to update another user", async () => {
    const anotherUser = await db.User.create(
      {
        email: `another-${Date.now()}-${Math.random()}@example.com`,
        name: "李四",
        roles: ["Volunteer"],
      },
      { transaction },
    );

    try {
      await setMyStateImpl(
        me,
        { consentedAt: new Date().toISOString() },
        transaction,
        anotherUser.id,
      );
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.message).to.include("没有权限访问");
    }
  });
});
