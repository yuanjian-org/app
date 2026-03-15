import { expect } from "chai";
import { createGroup, updateGroup } from "./groups";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";

describe("Groups API Internal Functions", () => {
  let transaction: Transaction;
  let user1: any;
  let user2: any;
  let user3: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    // Create test users
    user1 = await db.User.create(
      {
        email: "user1@example.com",
        name: "Test User 1",
        roles: [],
      },
      { transaction },
    );

    user2 = await db.User.create(
      {
        email: "user2@example.com",
        name: "Test User 2",
        roles: [],
      },
      { transaction },
    );

    user3 = await db.User.create(
      {
        email: "user3@example.com",
        name: "Test User 3",
        roles: [],
      },
      { transaction },
    );
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  describe("createGroup", () => {
    it("should create a group and associate users", async () => {
      const groupName = "Test Group 1";
      const userIds = [user1.id, user2.id];

      const groupId = await createGroup(
        groupName,
        userIds,
        null,
        null,
        transaction,
      );

      const group = await db.Group.findByPk(groupId, { transaction });
      expect(group).to.not.equal(null);
      expect(group?.name).to.equal(groupName);
      expect(group?.partnershipId).to.equal(null);
      expect(group?.interviewId).to.equal(null);

      const groupUsers = await db.GroupUser.findAll({
        where: { groupId },
        transaction,
      });

      expect(groupUsers).to.have.lengthOf(2);
      const associatedUserIds = groupUsers.map((gu: any) => gu.userId);
      expect(associatedUserIds).to.include.members(userIds);
    });
  });

  describe("updateGroup", () => {
    it("should update group properties and modify members", async () => {
      // Setup initial group
      const initialGroupName = "Initial Group";
      const groupId = await createGroup(
        initialGroupName,
        [user1.id, user2.id],
        null,
        null,
        transaction,
      );

      // Verify initial setup
      let groupUsers = await db.GroupUser.findAll({
        where: { groupId },
        transaction,
      });
      expect(groupUsers).to.have.lengthOf(2);

      // Perform update
      const updatedGroupName = "Updated Group";
      const newUserIds = [user2.id, user3.id]; // Remove user1, add user3

      const addedUserIds = await updateGroup(
        groupId,
        updatedGroupName,
        true, // isPublic
        newUserIds,
        transaction,
      );

      // Verify added users returned
      expect(addedUserIds).to.deep.equal([user3.id]);

      // Verify group properties updated
      const group = await db.Group.findByPk(groupId, { transaction });
      expect(group?.name).to.equal(updatedGroupName);
      expect(group?.public).to.equal(true);

      // Verify members updated
      groupUsers = await db.GroupUser.findAll({
        where: { groupId },
        transaction,
      });
      expect(groupUsers).to.have.lengthOf(2);
      const associatedUserIds = groupUsers.map((gu: any) => gu.userId);
      expect(associatedUserIds).to.include.members(newUserIds);
      expect(associatedUserIds).to.not.include(user1.id);
    });
  });
});
