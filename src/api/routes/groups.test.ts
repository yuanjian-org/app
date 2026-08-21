import { expect } from "chai";
import {
  createGroup,
  updateGroup,
  destroyGroup,
  archiveGroup,
  unarchiveGroup,
  listMineGroups,
  listGroups,
  getGroup,
  findGroups,
  checkPermissionForGroup,
  checkPermissionForGroupHistory,
} from "./groups";
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

  describe("destroyGroup", () => {
    it("should delete the group", async () => {
      const groupId = await createGroup(
        "To Delete",
        [user1.id],
        null,
        null,
        transaction,
      );
      await destroyGroup(groupId, transaction);
      const group = await db.Group.findByPk(groupId, { transaction });
      void expect(group).to.be.null;
    });

    it("should throw notFoundError if group does not exist", async () => {
      let error = null;
      try {
        await destroyGroup("00000000-0000-0000-0000-000000000000", transaction);
      } catch (e) {
        error = e;
      }
      void expect(error).to.not.be.null;
    });
  });

  describe("archiveGroup and unarchiveGroup", () => {
    it("should archive and unarchive the group", async () => {
      const groupId = await createGroup(
        "To Archive",
        [user1.id],
        null,
        null,
        transaction,
      );

      await archiveGroup(groupId, transaction);
      let group = await db.Group.findByPk(groupId, { transaction });
      void expect(group?.archived).to.be.true;

      await unarchiveGroup(groupId, transaction);
      group = await db.Group.findByPk(groupId, { transaction });
      void expect(group?.archived).to.be.false;
    });
  });

  describe("listMineGroups", () => {
    it("should list groups for a user", async () => {
      const groupId1 = await createGroup(
        "Group 1",
        [user1.id],
        null,
        null,
        transaction,
      );
      const groupId2 = await createGroup(
        "Group 2",
        [user1.id, user2.id],
        null,
        null,
        transaction,
      );
      const groupId3 = await createGroup(
        "Group 3",
        [user2.id],
        null,
        null,
        transaction,
      );

      const myGroups = await listMineGroups(user1.id, false, transaction);
      expect(myGroups).to.have.lengthOf(2);
      const groupIds = myGroups.map((g) => g.id);
      expect(groupIds).to.include(groupId1);
      expect(groupIds).to.include(groupId2);
      expect(groupIds).to.not.include(groupId3);
    });

    it("should correctly handle includeOwned", async () => {
      // We will create a group with an interview ID which acts as 'owned'
      const g = await db.Group.create(
        {
          name: "Owned Group",
          partnershipId: "test", // This makes it owned
        },
        { transaction },
      );
      await db.GroupUser.create(
        {
          groupId: g.id,
          userId: user1.id,
        },
        { transaction },
      );

      let groups = await listMineGroups(user1.id, false, transaction);
      void expect(groups.find((x) => x.id === g.id)).to.be.undefined;

      groups = await listMineGroups(user1.id, true, transaction);
      void expect(groups.find((x) => x.id === g.id)).to.not.be.undefined;
    });
  });

  describe("listGroups", () => {
    it("should list all groups when userIds is empty", async () => {
      await createGroup("Group 1", [user1.id], null, null, transaction);
      await createGroup("Group 2", [user2.id], null, null, transaction);

      const allGroups = await listGroups([], false, true, transaction);
      expect(allGroups.length).to.be.greaterThanOrEqual(2);
    });

    it("should filter by userIds", async () => {
      const groupId1 = await createGroup(
        "Shared Group",
        [user1.id, user2.id],
        null,
        null,
        transaction,
      );
      await createGroup("User 1 Only", [user1.id], null, null, transaction);

      const sharedGroups = await listGroups(
        [user1.id, user2.id],
        false,
        true,
        transaction,
      );
      expect(sharedGroups).to.have.lengthOf(1);
      expect(sharedGroups[0].id).to.equal(groupId1);
    });
  });

  describe("getGroup", () => {
    it("should retrieve a group and check permissions", async () => {
      const groupId = await createGroup(
        "My Group",
        [user1.id],
        null,
        null,
        transaction,
      );
      const group = await getGroup(groupId, user1, transaction);
      void expect(group).to.not.be.null;
      expect(group.name).to.equal("My Group");
    });

    it("should throw error if user has no permission", async () => {
      const groupId = await createGroup(
        "Not My Group",
        [user2.id],
        null,
        null,
        transaction,
      );
      let error = null;
      try {
        await getGroup(groupId, user1, transaction);
      } catch (e: any) {
        error = e;
      }
      void expect(error).to.not.be.null;
      expect(error?.message).to.include("没有权限访问");
    });
  });

  describe("findGroups", () => {
    it("should find inclusive groups", async () => {
      const groupId1 = await createGroup(
        "Inclusive Group",
        [user1.id, user2.id, user3.id],
        null,
        null,
        transaction,
      );
      const groups = await findGroups(
        [user1.id, user2.id],
        "inclusive",
        undefined,
        undefined,
        transaction,
      );
      expect(groups).to.have.lengthOf(1);
      expect(groups[0].id).to.equal(groupId1);
    });

    it("should find exclusive groups", async () => {
      await createGroup(
        "Inclusive Group",
        [user1.id, user2.id, user3.id],
        null,
        null,
        transaction,
      );
      const groupId2 = await createGroup(
        "Exclusive Group",
        [user1.id, user2.id],
        null,
        null,
        transaction,
      );

      const groups = await findGroups(
        [user1.id, user2.id],
        "exclusive",
        undefined,
        undefined,
        transaction,
      );
      expect(groups).to.have.lengthOf(1);
      expect(groups[0].id).to.equal(groupId2);
    });
  });

  describe("checkPermissionForGroup and checkPermissionForGroupHistory", () => {
    it("should permit members", async () => {
      const groupId = await createGroup(
        "My Group",
        [user1.id],
        null,
        null,
        transaction,
      );
      const group = await db.Group.findByPk(groupId, {
        include: [db.GroupUser],
        transaction,
      });
      expect(() => checkPermissionForGroup(user1, group as any)).to.not.throw();
      expect(() =>
        checkPermissionForGroupHistory(user1, group as any),
      ).to.not.throw();
    });

    it("should deny non-members without proper roles", async () => {
      const groupId = await createGroup(
        "My Group",
        [user1.id],
        null,
        null,
        transaction,
      );
      const group = await db.Group.findByPk(groupId, {
        include: [db.GroupUser],
        transaction,
      });
      expect(() => checkPermissionForGroup(user2, group as any)).to.throw();
      expect(() =>
        checkPermissionForGroupHistory(user2, group as any),
      ).to.throw();
    });
  });
});
