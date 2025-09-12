import { expect } from "chai";
import { validatePearlStudent } from "./pearlStudents";
import db from "../database/db";
import sequelize from "../database/sequelize";
import User from "../../shared/User";

describe("validatePearlStudent", () => {
  let testUser: User;
  let testPearlStudent: any;

  before(async () => {
    // Create a test user
    testUser = await db.User.create({
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: "Test Pearl User",
      email: "testpearl@example.com",
      roles: ["Mentee"],
      menteeStatus: "现届学子",
      menteeApplication: {},
    });

    // Create a test pearl student
    testPearlStudent = await db.PearlStudent.create({
      pearlId: "P123456",
      name: "张三",
      lowerCaseNationalIdLastFour: "1234",
      userId: null,
    });
  });

  after(async () => {
    // Clean up test data
    if (testUser) {
      await db.User.destroy({ where: { id: testUser.id } });
    }
    if (testPearlStudent) {
      await db.PearlStudent.destroy({
        where: { pearlId: testPearlStudent.pearlId },
      });
    }
  });

  it("should accept valid pearl student", async () => {
    // Use a transaction for the test
    await sequelize.transaction(async (transaction) => {
      // Should not throw
      await validatePearlStudent(
        testUser,
        "张三",
        "P123456",
        "1234",
        "wechat123",
        transaction,
      );
    });

    // Verify the pearl student was updated with userId
    const updatedStudent = await db.PearlStudent.findByPk("P123456");
    expect(updatedStudent?.userId).to.equal(testUser.id);

    // Verify the user was updated
    const updatedUser = await db.User.findByPk(testUser.id);
    expect(updatedUser?.name).to.equal("张三");
    expect(updatedUser?.wechat).to.equal("wechat123");
    expect(updatedUser?.menteeApplication?.["合作机构来源"]).to.equal(
      "珍珠生：P123456",
    );
  });

  it("should reject non-pearl student", async () => {
    // Use a transaction for the test
    await sequelize.transaction(async (transaction) => {
      // Should throw error
      try {
        await validatePearlStudent(
          testUser,
          "李四",
          "P999999",
          "5678",
          "wechat456",
          transaction,
        );
        expect.fail("Expected validatePearlStudent to throw an error");
      } catch (error: any) {
        expect(error.message).to.include("珍珠生信息不匹配");
      }
    });
  });

  it("should reject already validated pearl student", async () => {
    // Create another test user and pearl student
    const anotherUser = await db.User.create({
      id: "550e8400-e29b-41d4-a716-446655440002",
      name: "Another Test User",
      email: "anothertest@example.com",
      roles: ["Mentee"],
      menteeStatus: "现届学子",
      menteeApplication: {},
    });

    const anotherPearlStudent = await db.PearlStudent.create({
      pearlId: "P789012",
      name: "李四",
      lowerCaseNationalIdLastFour: "5678",
      userId: anotherUser.id, // Already validated
    });

    try {
      // Use a transaction for the test
      await sequelize.transaction(async (transaction) => {
        // Should throw error for already validated student
        try {
          await validatePearlStudent(
            testUser,
            "李四",
            "P789012",
            "5678",
            "wechat789",
            transaction,
          );
          expect.fail("Expected validatePearlStudent to throw an error");
        } catch (error: any) {
          expect(error.message).to.include("此珍珠生号已被验证");
        }
      });
    } finally {
      // Clean up
      await db.User.destroy({ where: { id: anotherUser.id } });
      await db.PearlStudent.destroy({
        where: { pearlId: anotherPearlStudent.pearlId },
      });
    }
  });
});
