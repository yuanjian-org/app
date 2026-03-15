import { expect } from "chai";
import { Op } from "sequelize";
import { isAutoTaskOrCreatorIsOther } from "./tasks";

describe("isAutoTaskOrCreatorIsOther", () => {
  it("should return a Sequelize operator that matches auto tasks (null creatorId)", () => {
    const operator = isAutoTaskOrCreatorIsOther("user1") as any;
    expect(operator[Op.or]).to.be.an("array");
    expect(operator[Op.or]).to.deep.include({ [Op.eq]: null });
  });

  it("should return a Sequelize operator that excludes the assignee", () => {
    const operator = isAutoTaskOrCreatorIsOther("user1") as any;
    expect(operator[Op.or]).to.be.an("array");
    expect(operator[Op.or]).to.deep.include({ [Op.ne]: "user1" });
  });

  it("should match both null and other user IDs", () => {
    // This is more of a conceptual test of what the operator represents
    const operator = isAutoTaskOrCreatorIsOther("user1");
    expect(operator).to.deep.equal({
      [Op.or]: [{ [Op.eq]: null }, { [Op.ne]: "user1" }],
    });
  });
});
