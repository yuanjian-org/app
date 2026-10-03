import { expect } from "chai";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { generateDemoData } from "./generateDemoData";

describe("generateDemoData", () => {
  it("should successfully run and create records in the database", async () => {
    let errorCaught: any = null;

    try {
      await sequelize.transaction(async (transaction) => {
        await generateDemoData(transaction);

        const usersCount = await db.User.count({ transaction });
        expect(usersCount).to.be.greaterThan(0);

        const groupsCount = await db.Group.count({ transaction });
        expect(groupsCount).to.be.greaterThan(0);

        const mentorshipsCount = await db.Mentorship.count({ transaction });
        expect(mentorshipsCount).to.be.greaterThan(0);

        const shudongPostsCount = await db.ShudongPost.count({ transaction });
        expect(shudongPostsCount).to.be.greaterThan(0);

        const adminUser = await db.User.findOne({
          where: { email: "admin@de.mo" },
          transaction,
        });
        void expect(adminUser).to.not.be.null;
        void expect(adminUser?.roles).to.include("ShudongAdmin");

        throw new Error("ROLLBACK_FOR_TEST");
      });
    } catch (e: any) {
      errorCaught = e;
    }

    expect(errorCaught).to.not.equal(null);
    if (errorCaught.message !== "ROLLBACK_FOR_TEST") {
      console.error(errorCaught);
    }
    expect(errorCaught.message).to.equal("ROLLBACK_FOR_TEST");
  });
});
