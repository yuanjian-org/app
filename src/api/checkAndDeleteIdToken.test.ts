import db from "./database/db";
import sequelize from "./database/sequelize";
import { checkAndDeleteIdToken } from "./checkAndDeleteIdToken";
import { Transaction } from "sequelize";
import { expect } from "chai";
import { TRPCError } from "@trpc/server";
import sinon from "sinon";

describe("checkAndDeleteIdToken", () => {
  let transaction: Transaction;
  const phone = "+8613800138000";
  const token = "123456";
  let idTokenStub: any;

  beforeEach(async () => {
    transaction = {} as Transaction;
    idTokenStub = {
      token,
      updatedAt: new Date(),
      failedAttempts: 0,
      increment: sinon.stub().resolves(),
      reload: sinon.stub().resolves(),
      destroy: sinon.stub().resolves(),
    };
    sinon.stub(db.IdToken, "findOne").resolves(idTokenStub);
  });

  afterEach(async () => {
    sinon.restore();
  });

  it("should succeed with correct token and delete it", async () => {
    await checkAndDeleteIdToken("phone", phone, token, transaction);
    expect(idTokenStub.destroy.calledOnce).to.be.true;
  });

  it("should increment failedAttempts on wrong token", async () => {
    try {
      await checkAndDeleteIdToken("phone", phone, "wrong", transaction);
      expect.fail("Should have thrown");
    } catch (e: any) {
      expect(e.message).to.contain("手机验证码错误");
    }

    expect(idTokenStub.increment.calledWith("failedAttempts")).to.be.true;
    expect(idTokenStub.reload.calledOnce).to.be.true;
  });

  it("should delete token when failedAttempts reaches 5", async () => {
    idTokenStub.failedAttempts = 5;
    try {
      await checkAndDeleteIdToken("phone", phone, "wrong", transaction);
      expect.fail("Should have thrown");
    } catch (e: any) {
      expect(e.message).to.contain("手机验证码错误");
    }

    expect(idTokenStub.destroy.calledOnce).to.be.true;
  });

  it("should throw error if token not found", async () => {
    idTokenStub = null;
    (db.IdToken.findOne as sinon.SinonStub).resolves(null);
    try {
      await checkAndDeleteIdToken("phone", "nonexistent", token, transaction);
      expect.fail("Should have thrown");
    } catch (e: any) {
      expect(e.message).to.contain("手机验证码错误");
    }
  });
});
