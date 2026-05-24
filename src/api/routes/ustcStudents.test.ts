import { expect } from "chai";
import sinon from "sinon";
import db from "../database/db";
import sequelize from "../database/sequelize";
import * as checkAndDeleteIdTokenModule from "../../api/checkAndDeleteIdToken";
import { validateImpl } from "./ustcStudents";

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
      await validateImpl(user, "test@ustc.edu.cn", "123456", transaction);
    });

    const updatedUser = await db.User.findByPk(user.id);
    expect(updatedUser?.email).to.equal("test@ustc.edu.cn");
    expect(updatedUser?.roles).to.deep.equal(["Mentee"]);
    expect(updatedUser?.menteeStatus).to.equal("现届学子");

    expect(checkStub.callCount).to.equal(1);
    expect(checkStub.firstCall.args[0]).to.equal("email");
    expect(checkStub.firstCall.args[1]).to.equal("test@ustc.edu.cn");
    expect(checkStub.firstCall.args[2]).to.equal("123456");

    await db.User.destroy({ where: { id: user.id } });
  });
});
