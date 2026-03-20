import { expect } from "chai";
import sinon from "sinon";
import { authOptions, ImpersonationRequest } from "./[...nextauth]";
import db from "../../../api/database/db";
import sequelize from "../../../api/database/sequelize";
import { Transaction } from "sequelize";

describe("nextauth jwt callback", () => {
  let findByPkStub: sinon.SinonStub;
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
    const originalFindByPk = db.User.findByPk.bind(db.User);
    findByPkStub = sinon.stub(db.User, "findByPk").callsFake((id, options) => {
      return originalFindByPk(id, { ...options, transaction });
    });
  });

  afterEach(async () => {
    if (transaction) {
      await transaction.rollback();
    }
    sinon.restore();
  });

  it("should return token immediately if impersonate is undefined", async () => {
    const jwtCallback = authOptions().callbacks!.jwt! as (
      params: any,
    ) => Promise<any>;
    const token = { sub: "user-123" };
    const session = { somethingElse: true };
    const result = await jwtCallback({ token, trigger: "update", session });

    expect(result).to.deep.equal({ sub: "user-123" });
    void expect(findByPkStub.called).to.be.false;
  });

  it("should delete impersonateTokenKey if impersonate is null", async () => {
    const jwtCallback = authOptions().callbacks!.jwt! as (
      params: any,
    ) => Promise<any>;
    const token = { sub: "user-123", imp: "other-user" };
    const session: ImpersonationRequest = { impersonate: null };
    const result = await jwtCallback({ token, trigger: "update", session });

    expect(result).to.deep.equal({ sub: "user-123" });
    void expect(findByPkStub.called).to.be.false;
  });

  it("should set impersonateTokenKey if user is UserManager", async () => {
    const jwtCallback = authOptions().callbacks!.jwt! as (
      params: any,
    ) => Promise<any>;

    const user = await db.User.create(
      { name: "Test User", email: "test1@test.com", roles: ["UserManager"] },
      { transaction },
    );
    const token = { sub: user.id };
    const session: ImpersonationRequest = { impersonate: "target-user" };

    const result = await jwtCallback({ token, trigger: "update", session });

    expect(result.imp).to.equal("target-user");
    void expect(findByPkStub.calledOnceWith(user.id)).to.be.true;
  });

  it("should throw error if user is not UserManager", async () => {
    const jwtCallback = authOptions().callbacks!.jwt! as (
      params: any,
    ) => Promise<any>;
    const user = await db.User.create(
      { name: "Test User", email: "test2@test.com", roles: ["Mentee"] },
      { transaction },
    );
    const token = { sub: user.id };
    const session: ImpersonationRequest = { impersonate: "target-user" };

    try {
      await jwtCallback({ token, trigger: "update", session });
      expect.fail("Should have thrown error");
    } catch (e: any) {
      expect(e.message).to.equal("没有权限访问用户 target-user。");
    }
  });

  it("should check roles of mergedTo user if account was merged", async () => {
    const jwtCallback = authOptions().callbacks!.jwt! as (
      params: any,
    ) => Promise<any>;
    const actualUser = await db.User.create(
      { name: "Test User 456", email: "test456@test.com", roles: ["Mentee"] },
      { transaction },
    );
    const mergedUser = await db.User.create(
      {
        name: "Test User 123",
        email: "test1234@test.com",
        roles: ["UserManager"],
        mergedTo: actualUser.id,
      },
      { transaction },
    );
    const token = { sub: mergedUser.id };
    const session: ImpersonationRequest = { impersonate: "target-user" };

    try {
      await jwtCallback({ token, trigger: "update", session });
      expect.fail("Should have thrown error");
    } catch (e: any) {
      expect(e.message).to.equal("没有权限访问用户 target-user。");
    }

    expect(findByPkStub.callCount).to.equal(2);
    expect(findByPkStub.firstCall.args[0]).to.equal(mergedUser.id);
    expect(findByPkStub.secondCall.args[0]).to.equal(actualUser.id);
  });

  it("should allow impersonation if mergedTo actual user is UserManager", async () => {
    const jwtCallback = authOptions().callbacks!.jwt! as (
      params: any,
    ) => Promise<any>;
    const actualUser = await db.User.create(
      {
        name: "Test User 456",
        email: "test4567@test.com",
        roles: ["UserManager"],
      },
      { transaction },
    );
    const mergedUser = await db.User.create(
      {
        name: "Test User 123",
        email: "test12345@test.com",
        roles: ["Mentee"],
        mergedTo: actualUser.id,
      },
      { transaction },
    );
    const token = { sub: mergedUser.id };
    const session: ImpersonationRequest = { impersonate: "target-user" };

    const result = await jwtCallback({ token, trigger: "update", session });

    expect(result.imp).to.equal("target-user");
  });
});
