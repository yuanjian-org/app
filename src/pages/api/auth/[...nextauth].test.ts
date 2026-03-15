import { expect } from "chai";
import sinon from "sinon";
import { authOptions, ImpersonationRequest } from "./[...nextauth]";
import db from "../../../api/database/db";

describe("nextauth jwt callback", () => {
  let findByPkStub: sinon.SinonStub;

  beforeEach(() => {
    findByPkStub = sinon.stub(db.User, "findByPk");
  });

  afterEach(() => {
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
    const token = { sub: "user-123" };
    const session: ImpersonationRequest = { impersonate: "target-user" };

    findByPkStub.resolves({ roles: ["UserManager"], mergedTo: null });

    const result = await jwtCallback({ token, trigger: "update", session });

    expect(result.imp).to.equal("target-user");
    void expect(findByPkStub.calledOnceWith("user-123")).to.be.true;
  });

  it("should throw error if user is not UserManager", async () => {
    const jwtCallback = authOptions().callbacks!.jwt! as (
      params: any,
    ) => Promise<any>;
    const token = { sub: "user-123" };
    const session: ImpersonationRequest = { impersonate: "target-user" };

    findByPkStub.resolves({ roles: ["Mentee"], mergedTo: null });

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
    const token = { sub: "user-123" };
    const session: ImpersonationRequest = { impersonate: "target-user" };

    findByPkStub
      .onFirstCall()
      .resolves({ roles: ["UserManager"], mergedTo: "user-456" });
    findByPkStub.onSecondCall().resolves({ roles: ["Mentee"] });

    try {
      await jwtCallback({ token, trigger: "update", session });
      expect.fail("Should have thrown error");
    } catch (e: any) {
      expect(e.message).to.equal("没有权限访问用户 target-user。");
    }

    expect(findByPkStub.callCount).to.equal(2);
    expect(findByPkStub.firstCall.args[0]).to.equal("user-123");
    expect(findByPkStub.secondCall.args[0]).to.equal("user-456");
  });

  it("should allow impersonation if mergedTo actual user is UserManager", async () => {
    const jwtCallback = authOptions().callbacks!.jwt! as (
      params: any,
    ) => Promise<any>;
    const token = { sub: "user-123" };
    const session: ImpersonationRequest = { impersonate: "target-user" };

    findByPkStub
      .onFirstCall()
      .resolves({ roles: ["Mentee"], mergedTo: "user-456" });
    findByPkStub.onSecondCall().resolves({ roles: ["UserManager"] });

    const result = await jwtCallback({ token, trigger: "update", session });

    expect(result.imp).to.equal("target-user");
  });
});
