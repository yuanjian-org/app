import { expect } from "chai";
import sinon from "sinon";
import { authOptions, ImpersonationRequest } from "./[...nextauth]";
import db from "../../../api/database/db";
import sequelize from "../../../api/database/sequelize";
import { Transaction } from "sequelize";

describe("nextauth jwt callback", () => {
  let transaction: Transaction;
  let findByPkStub: sinon.SinonStub;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
    const originalFindByPk = db.User.findByPk.bind(db.User);
    findByPkStub = sinon
      .stub(db.User, "findByPk")
      .callsFake(async (id: any, options: any) => {
        return await originalFindByPk(id, { ...options, transaction });
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
    const user = await db.User.create(
      {
        name: "User Manager",
        roles: ["UserManager"],
      },
      { transaction },
    );

    const jwtCallback = authOptions().callbacks!.jwt! as (
      params: any,
    ) => Promise<any>;
    const token = { sub: user.id };
    const session: ImpersonationRequest = { impersonate: "target-user" };

    const result = await jwtCallback({ token, trigger: "update", session });

    expect(result.imp).to.equal("target-user");
    void expect(findByPkStub.calledOnceWith(user.id)).to.be.true;
  });

  it("should throw error if user is not UserManager", async () => {
    const user = await db.User.create(
      {
        name: "Mentee User",
        roles: ["Mentee"],
      },
      { transaction },
    );

    const jwtCallback = authOptions().callbacks!.jwt! as (
      params: any,
    ) => Promise<any>;
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
    const activeUser = await db.User.create(
      {
        name: "Active Mentee",
        roles: ["Mentee"],
      },
      { transaction },
    );

    const mergedUser = await db.User.create(
      {
        name: "Merged UserManager",
        roles: ["UserManager"],
        mergedTo: activeUser.id,
      },
      { transaction },
    );

    const jwtCallback = authOptions().callbacks!.jwt! as (
      params: any,
    ) => Promise<any>;
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
    expect(findByPkStub.secondCall.args[0]).to.equal(activeUser.id);
  });

  it("should allow impersonation if mergedTo actual user is UserManager", async () => {
    const activeUser = await db.User.create(
      {
        name: "Active UserManager",
        roles: ["UserManager"],
      },
      { transaction },
    );

    const mergedUser = await db.User.create(
      {
        name: "Merged Mentee",
        roles: ["Mentee"],
        mergedTo: activeUser.id,
      },
      { transaction },
    );

    const jwtCallback = authOptions().callbacks!.jwt! as (
      params: any,
    ) => Promise<any>;
    const token = { sub: mergedUser.id };
    const session: ImpersonationRequest = { impersonate: "target-user" };

    const result = await jwtCallback({ token, trigger: "update", session });

    expect(result.imp).to.equal("target-user");
    expect(findByPkStub.callCount).to.equal(2);
  });
});
