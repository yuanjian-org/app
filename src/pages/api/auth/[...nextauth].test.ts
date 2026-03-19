import { expect } from "chai";
import sinon from "sinon";
import { authOptions, ImpersonationRequest } from "./[...nextauth]";
import db from "../../../api/database/db";
import sequelize from "../../../api/database/sequelize";
import { Transaction } from "sequelize";

describe("nextauth jwt callback", () => {
  let transaction: Transaction;
  let findByPkOriginal: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
    findByPkOriginal = db.User.findByPk;
    sinon.stub(db.User, "findByPk").callsFake((id, options) => {
      return findByPkOriginal.call(db.User, id, { ...options, transaction });
    });
  });

  afterEach(async () => {
    sinon.restore();
    if (transaction) await transaction.rollback();
  });

  it("should return token immediately if impersonate is undefined", async () => {
    const jwtCallback = authOptions().callbacks!.jwt! as (
      params: any,
    ) => Promise<any>;
    const token = { sub: "user-123" };
    const session = { somethingElse: true };
    const result = await jwtCallback({ token, trigger: "update", session });

    expect(result).to.deep.equal({ sub: "user-123" });
    void expect((db.User.findByPk as sinon.SinonStub).called).to.be.false;
  });

  it("should delete impersonateTokenKey if impersonate is null", async () => {
    const jwtCallback = authOptions().callbacks!.jwt! as (
      params: any,
    ) => Promise<any>;
    const token = { sub: "user-123", imp: "other-user" };
    const session: ImpersonationRequest = { impersonate: null };
    const result = await jwtCallback({ token, trigger: "update", session });

    expect(result).to.deep.equal({ sub: "user-123" });
    void expect((db.User.findByPk as sinon.SinonStub).called).to.be.false;
  });

  it("should set impersonateTokenKey if user is UserManager", async () => {
    const jwtCallback = authOptions().callbacks!.jwt! as (
      params: any,
    ) => Promise<any>;
    const user = await db.User.create(
      { email: "test1@example.com", name: "Test 1", roles: ["UserManager"] },
      { transaction },
    );
    const token = { sub: user.id };
    const session: ImpersonationRequest = { impersonate: "target-user" };

    const result = await jwtCallback({ token, trigger: "update", session });

    expect(result.imp).to.equal("target-user");
    void expect((db.User.findByPk as sinon.SinonStub).calledOnceWith(user.id))
      .to.be.true;
  });

  it("should throw error if user is not UserManager", async () => {
    const jwtCallback = authOptions().callbacks!.jwt! as (
      params: any,
    ) => Promise<any>;
    const user = await db.User.create(
      { email: "test2@example.com", name: "Test 2", roles: ["Mentee"] },
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
    const targetUser = await db.User.create(
      { email: "target@example.com", name: "Target", roles: ["Mentee"] },
      { transaction },
    );
    const sourceUser = await db.User.create(
      {
        email: "source@example.com",
        name: "Source",
        roles: ["UserManager"],
        mergedTo: targetUser.id,
      },
      { transaction },
    );

    const token = { sub: sourceUser.id };
    const session: ImpersonationRequest = { impersonate: "target-user" };

    try {
      await jwtCallback({ token, trigger: "update", session });
      expect.fail("Should have thrown error");
    } catch (e: any) {
      expect(e.message).to.equal("没有权限访问用户 target-user。");
    }

    const findByPkStub = db.User.findByPk as sinon.SinonStub;
    expect(findByPkStub.callCount).to.equal(2);
    expect(findByPkStub.firstCall.args[0]).to.equal(sourceUser.id);
    expect(findByPkStub.secondCall.args[0]).to.equal(targetUser.id);
  });

  it("should allow impersonation if mergedTo actual user is UserManager", async () => {
    const jwtCallback = authOptions().callbacks!.jwt! as (
      params: any,
    ) => Promise<any>;
    const targetUser = await db.User.create(
      { email: "target2@example.com", name: "Target", roles: ["UserManager"] },
      { transaction },
    );
    const sourceUser = await db.User.create(
      {
        email: "source2@example.com",
        name: "Source",
        roles: ["Mentee"],
        mergedTo: targetUser.id,
      },
      { transaction },
    );

    const token = { sub: sourceUser.id };
    const session: ImpersonationRequest = { impersonate: "target-user" };

    const result = await jwtCallback({ token, trigger: "update", session });

    expect(result.imp).to.equal("target-user");
  });
});
