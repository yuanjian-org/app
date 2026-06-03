import { expect } from "chai";
import sinon from "sinon";
import db from "../database/db";
import sequelize from "../database/sequelize";
import * as checkAndDeleteIdTokenModule from "../../api/checkAndDeleteIdToken";
import { validateImpl } from "./ustcStudents";

import { TRPCError } from "@trpc/server";

describe("ustcStudents.validate", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should validate and update user", async () => {
    const user = await db.User.create({ name: "Test User", roles: [] });

    const checkStub = sinon
      .stub(checkAndDeleteIdTokenModule, "checkAndDeleteIdToken")
      .resolves();

    // Use a real transaction, wait for it to finish, then assert from db.
    await sequelize.transaction(async (transaction) => {
      await validateImpl(user, "test@mail.ustc.edu.cn", "123456", transaction);
    });

    const updatedUser = await db.User.findByPk(user.id);
    expect(updatedUser?.email).to.equal("test@mail.ustc.edu.cn");
    expect(updatedUser?.roles).to.deep.equal(["Mentee"]);
    expect(updatedUser?.menteeStatus).to.equal("现届学子");

    expect(checkStub.callCount).to.equal(1);
    expect(checkStub.firstCall.args[0]).to.equal("email");
    expect(checkStub.firstCall.args[1]).to.equal("test@mail.ustc.edu.cn");
    expect(checkStub.firstCall.args[2]).to.equal("123456");

    await db.User.destroy({ where: { id: user.id } });
  });

  it("should throw error if email does not end with @mail.ustc.edu.cn", async () => {
    const user = await db.User.create({ name: "Test User", roles: [] });

    let error: any;
    try {
      await sequelize.transaction(async (transaction) => {
        await validateImpl(user, "test@example.com", "123456", transaction);
      });
    } catch (e) {
      error = e;
    }

    expect(error).to.be.instanceOf(TRPCError);
    expect(error.message).to.equal("邮箱必须是中科大邮箱。");

    await db.User.destroy({ where: { id: user.id } });
  });

  it("should keep existing menteeStatus if it is already set", async () => {
    const user = await db.User.create({
      name: "Test User",
      roles: [],
      menteeStatus: "活跃校友",
    });

    sinon.stub(checkAndDeleteIdTokenModule, "checkAndDeleteIdToken").resolves();

    await sequelize.transaction(async (transaction) => {
      await validateImpl(user, "test2@mail.ustc.edu.cn", "123456", transaction);
    });

    const updatedUser = await db.User.findByPk(user.id);
    expect(updatedUser?.menteeStatus).to.equal("活跃校友");
    expect(updatedUser?.roles).to.deep.equal(["Mentee"]);
    expect(updatedUser?.email).to.equal("test2@mail.ustc.edu.cn");

    await db.User.destroy({ where: { id: user.id } });
  });
});
