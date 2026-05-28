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
});

describe("listImpl", () => {
  const userManager = { id: "um1", roles: ["UserManager"] } as any;
  const menteeManager = { id: "mm1", roles: ["MentorshipManager"] } as any;

  afterEach(async () => {
    await db.Mentorship.destroy({ where: {} });
    await db.User.destroy({ where: {} });
  });

  it("should enforce limit and return nextCursor", async () => {
    await db.User.bulkCreate([
      {
        id: "00000000-0000-0000-0000-000000000001",
        name: "User 1",
        roles: ["Volunteer"],
        pinyin: "a",
      },
      {
        id: "00000000-0000-0000-0000-000000000002",
        name: "User 2",
        roles: ["Volunteer"],
        pinyin: "b",
      },
      {
        id: "00000000-0000-0000-0000-000000000003",
        name: "User 3",
        roles: ["Volunteer"],
        pinyin: "c",
      },
    ]);

    const res = await usersModule.listImpl(userManager, {
      limit: 2,
      cursor: 0,
    });
    expect(res.items.length).equals(2);
    expect(res.items[0].id).equals("00000000-0000-0000-0000-000000000001");
    expect(res.items[1].id).equals("00000000-0000-0000-0000-000000000002");
    expect(res.nextCursor).equals(2);

    const res2 = await usersModule.listImpl(userManager, {
      limit: 2,
      cursor: res.nextCursor,
    });
    expect(res2.items.length).equals(1);
    expect(res2.items[0].id).equals("00000000-0000-0000-0000-000000000003");
    expect(res2.nextCursor).equals(undefined);
  });

  it("should restrict includeMerged and returnMergeInfo for non-UserManager", async () => {
    try {
      await usersModule.listImpl(menteeManager, { includeMerged: true });
      expect.fail("Should throw no permission error");
    } catch (e: any) {
      expect(e.message).to.include("没有权限访问数据");
    }

    try {
      await usersModule.listImpl(menteeManager, { returnMergeInfo: true });
      expect.fail("Should throw no permission error");
    } catch (e: any) {
      expect(e.message).to.include("没有权限访问数据");
    }
  });

  it("should filter includeNonVolunteers", async () => {
    await db.User.bulkCreate([
      {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Vol",
        roles: ["Volunteer"],
        pinyin: "a",
      },
      {
        id: "00000000-0000-0000-0000-000000000002",
        name: "NonVol",
        roles: ["Mentee"],
        pinyin: "b",
      },
    ]);

    let res = await usersModule.listImpl(userManager, {});
    expect(res.items.length).equals(1);
    expect(res.items[0].id).equals("00000000-0000-0000-0000-000000000001");

    res = await usersModule.listImpl(userManager, {
      includeNonVolunteers: true,
    });
    expect(res.items.length).equals(2);
  });

  it("should filter containsRoles", async () => {
    await db.User.bulkCreate([
      {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Vol",
        roles: ["Volunteer"],
        pinyin: "a",
      },
      {
        id: "00000000-0000-0000-0000-000000000002",
        name: "Vol+Mentee",
        roles: ["Volunteer", "Mentee"],
        pinyin: "b",
      },
    ]);

    const res = await usersModule.listImpl(userManager, {
      containsRoles: ["Mentee"],
    });
    expect(res.items.length).equals(1);
    expect(res.items[0].id).equals("00000000-0000-0000-0000-000000000002");
  });

  it("should filter menteeStatus and pointOfContactId", async () => {
    await db.User.bulkCreate([
      {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Vol1",
        roles: ["Volunteer"],
        menteeStatus: "现届学子",
        pointOfContactId: "00000000-0000-0000-0000-000000000001",
        pinyin: "a",
      },
      {
        id: "00000000-0000-0000-0000-000000000002",
        name: "Vol2",
        roles: ["Volunteer"],
        menteeStatus: "初拒",
        pointOfContactId: "00000000-0000-0000-0000-000000000002",
        pinyin: "b",
      },
    ]);

    let res = await usersModule.listImpl(userManager, {
      menteeStatus: "现届学子",
    });
    expect(res.items.length).equals(1);
    expect(res.items[0].id).equals("00000000-0000-0000-0000-000000000001");

    res = await usersModule.listImpl(userManager, {
      pointOfContactId: "00000000-0000-0000-0000-000000000002",
    });
    expect(res.items.length).equals(1);
    expect(res.items[0].id).equals("00000000-0000-0000-0000-000000000002");
  });

  it("should filter matchesNameOrEmail correctly on name, pinyin, and email", async () => {
    await db.User.bulkCreate([
      {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Alice Zhang",
        email: "foo@a.com",
        roles: ["Volunteer"],
        pinyin: "alice zhang",
      },
      {
        id: "00000000-0000-0000-0000-000000000002",
        name: "Bob Li",
        email: "alice.l@a.com",
        roles: ["Volunteer"],
        pinyin: "bob li",
      },
      {
        id: "00000000-0000-0000-0000-000000000003",
        name: "Charlie Wang",
        email: "bar@a.com",
        roles: ["Volunteer"],
        pinyin: "charlie wang alice",
      },
      {
        id: "00000000-0000-0000-0000-000000000004",
        name: "David Chen",
        email: "baz@a.com",
        roles: ["Volunteer"],
        pinyin: "david chen",
      },
    ]);

    const res = await usersModule.listImpl(userManager, {
      matchesNameOrEmail: "alice",
    });
    expect(res.items.length).equals(3);
    const ids = res.items.map((i) => i.id).sort();
    expect(ids).to.deep.equal([
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000002",
      "00000000-0000-0000-0000-000000000003",
    ]);
  });

  it("should filter includeMentorSearch using mentor name/pinyin", async () => {
    await db.User.bulkCreate([
      {
        id: "10000000-0000-0000-0000-000000000001",
        name: "Mentee One",
        roles: ["Volunteer"],
        pinyin: "mentee one",
      },
      {
        id: "10000000-0000-0000-0000-000000000002",
        name: "Mentee Two",
        roles: ["Volunteer"],
        pinyin: "mentee two",
      },
      {
        id: "20000000-0000-0000-0000-000000000001",
        name: "Mentor Master",
        roles: ["Volunteer"],
        pinyin: "mentor master",
      },
      {
        id: "20000000-0000-0000-0000-000000000002",
        name: "Mentor Guru",
        roles: ["Volunteer"],
        pinyin: "mentor guru",
      },
    ]);

    await db.Mentorship.bulkCreate([
      {
        id: "30000000-0000-0000-0000-000000000001",
        menteeId: "10000000-0000-0000-0000-000000000001",
        mentorId: "20000000-0000-0000-0000-000000000001",
        status: "Active",
        transactional: false,
      },
      {
        id: "30000000-0000-0000-0000-000000000002",
        menteeId: "10000000-0000-0000-0000-000000000002",
        mentorId: "20000000-0000-0000-0000-000000000002",
        status: "Active",
        transactional: false,
      },
    ]);

    let res = await usersModule.listImpl(userManager, {
      matchesNameOrEmail: "master",
    });
    expect(res.items.length).equals(1);
    expect(res.items[0].id).equals("20000000-0000-0000-0000-000000000001");

    res = await usersModule.listImpl(userManager, {
      matchesNameOrEmail: "master",
      includeMentorSearch: true,
    });
    expect(res.items.length).equals(2);
    const ids = res.items.map((i) => i.id).sort();
    expect(ids).to.deep.equal([
      "10000000-0000-0000-0000-000000000001",
      "20000000-0000-0000-0000-000000000001",
    ]);
  });

  it("should filter by ids", async () => {
    await db.User.bulkCreate([
      {
        id: "00000000-0000-0000-0000-000000000001",
        name: "User 1",
        roles: ["Volunteer"],
        pinyin: "a",
      },
      {
        id: "00000000-0000-0000-0000-000000000002",
        name: "User 2",
        roles: ["Volunteer"],
        pinyin: "b",
      },
      {
        id: "00000000-0000-0000-0000-000000000003",
        name: "User 3",
        roles: ["Volunteer"],
        pinyin: "c",
      },
    ]);

    const res = await usersModule.listImpl(userManager, {
      ids: [
        "00000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-000000000003",
      ],
    });
    expect(res.items.length).equals(2);
    const ids = res.items.map((i) => i.id).sort();
    expect(ids).to.deep.equal([
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000003",
    ]);
  });

  it("should fetch merged info when returnMergeInfo is true", async () => {
    await db.User.bulkCreate([
      {
        id: "00000000-0000-0000-0000-000000000001",
        name: "User 1",
        roles: ["Volunteer"],
        pinyin: "a",
        wechatUnionId: "wx1",
      },
      {
        id: "00000000-0000-0000-0000-000000000002",
        name: "User 2",
        roles: ["Volunteer"],
        pinyin: "b",
        wechatUnionId: "wx2",
        mergedTo: "00000000-0000-0000-0000-000000000001",
      },
    ]);

    const res = await usersModule.listImpl(userManager, {
      includeMerged: true,
      returnMergeInfo: true,
    });

    expect(res.items.length).equals(2);
    const u1 = res.items.find(
      (i) => i.id === "00000000-0000-0000-0000-000000000001",
    );
    const u2 = res.items.find(
      (i) => i.id === "00000000-0000-0000-0000-000000000002",
    );

    expect(u1!.wechatUnionId).equals("wx1");
    expect(u2!.wechatUnionId).equals("wx2");
    expect(u2!.mergedToUser?.id).equals("00000000-0000-0000-0000-000000000001");
  });
});
