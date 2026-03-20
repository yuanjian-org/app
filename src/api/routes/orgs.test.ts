import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import {
  listOrgsImpl,
  listUserOrgsImpl,
  getOrgImpl,
  createOrgImpl,
  removeOrgImpl,
  updateOrgDescriptionImpl,
  joinOrgImpl,
  leaveOrgImpl,
  removeMentorImpl,
  addOwnerImpl,
  removeOwnerImpl,
} from "./orgs";

describe("orgs API routes", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  describe("listUserOrgsImpl", () => {
    it("should list all orgs the user is a mentor of in alphabetical order", async () => {
      const mentor = await db.User.create(
        { email: "user@test.com", name: "User" },
        { transaction },
      );

      const org1 = await db.Org.create({ name: "Z Org" }, { transaction });
      const org2 = await db.Org.create({ name: "A Org" }, { transaction });

      await db.OrgMentor.create(
        { orgId: org1.id, mentorId: mentor.id },
        { transaction },
      );
      await db.OrgMentor.create(
        { orgId: org2.id, mentorId: mentor.id },
        { transaction },
      );

      const userOrgs = await listUserOrgsImpl(mentor.id, transaction);
      void expect(userOrgs.length).to.equal(2);
      void expect(userOrgs[0].name).to.equal("A Org");
      void expect(userOrgs[1].name).to.equal("Z Org");
    });
  });

  describe("listOrgsImpl", () => {
    it("should list all orgs in alphabetical order", async () => {
      await db.Org.create({ name: "Z Org" }, { transaction });
      await db.Org.create({ name: "A Org" }, { transaction });

      const orgs = await listOrgsImpl(transaction);

      const testOrgs = orgs.filter(
        (o) => o.name === "Z Org" || o.name === "A Org",
      );
      void expect(testOrgs.length).to.equal(2);
      void expect(testOrgs[0].name).to.equal("A Org");
      void expect(testOrgs[1].name).to.equal("Z Org");
    });
  });

  describe("createOrgImpl", () => {
    it("should create a new org", async () => {
      const org = await createOrgImpl(
        { name: "New Org", description: "Desc" },
        transaction,
      );
      void expect(org.name).to.equal("New Org");
      void expect(org.description).to.equal("Desc");

      const dbOrg = await db.Org.findByPk(org.id, { transaction });
      void expect(dbOrg).to.not.be.null;
      void expect(dbOrg?.name).to.equal("New Org");
    });
  });

  describe("getOrgImpl", () => {
    it("should retrieve an org with mentors and owners", async () => {
      const org = await db.Org.create(
        { name: "Test Get Org" },
        { transaction },
      );

      const retrievedOrg = await getOrgImpl(org.id, transaction);
      void expect(retrievedOrg).to.not.be.null;
      void expect(retrievedOrg.id).to.equal(org.id);
      void expect(retrievedOrg.name).to.equal("Test Get Org");
      void expect(retrievedOrg.mentors).to.be.an("array");
      void expect(retrievedOrg.owners).to.be.an("array");
    });

    it("should throw not found error if org does not exist", async () => {
      let errorThrown = false;
      try {
        await getOrgImpl("00000000-0000-0000-0000-000000000000", transaction);
      } catch (e: any) {
        errorThrown = true;
        void expect(e.message).to.equal(
          "机构 00000000-0000-0000-0000-000000000000 不存在。",
        );
      }
      void expect(errorThrown).to.be.true;
    });
  });

  describe("removeOrgImpl", () => {
    it("should remove an org", async () => {
      const org = await db.Org.create({ name: "To Remove" }, { transaction });
      await removeOrgImpl(org.id, transaction);

      const dbOrg = await db.Org.findByPk(org.id, { transaction });
      void expect(dbOrg).to.be.null;
    });

    it("should throw not found error if org to remove does not exist", async () => {
      let errorThrown = false;
      try {
        await removeOrgImpl(
          "00000000-0000-0000-0000-000000000000",
          transaction,
        );
      } catch (e: any) {
        errorThrown = true;
        void expect(e.message).to.equal(
          "机构 00000000-0000-0000-0000-000000000000 不存在。",
        );
      }
      void expect(errorThrown).to.be.true;
    });
  });

  describe("updateOrgDescriptionImpl", () => {
    it("should allow an OrgAdmin to update description", async () => {
      const org = await db.Org.create(
        { name: "Admin Test", description: "Old Desc" },
        { transaction },
      );
      const admin = await db.User.create(
        { email: "admin@test.com", name: "Admin", roles: ["OrgAdmin"] },
        { transaction },
      );

      await updateOrgDescriptionImpl(
        admin,
        { id: org.id, description: "New Desc" },
        transaction,
      );

      const updatedOrg = await db.Org.findByPk(org.id, { transaction });
      void expect(updatedOrg?.description).to.equal("New Desc");
    });

    it("should allow an OrgOwner to update description", async () => {
      const org = await db.Org.create(
        { name: "Owner Test", description: "Old Desc" },
        { transaction },
      );
      const owner = await db.User.create(
        { email: "owner@test.com", name: "Owner", roles: [] },
        { transaction },
      );
      await db.OrgOwner.create(
        { orgId: org.id, ownerId: owner.id },
        { transaction },
      );

      await updateOrgDescriptionImpl(
        owner,
        { id: org.id, description: "New Desc" },
        transaction,
      );

      const updatedOrg = await db.Org.findByPk(org.id, { transaction });
      void expect(updatedOrg?.description).to.equal("New Desc");
    });

    it("should deny updating description if not an admin or owner", async () => {
      const org = await db.Org.create(
        { name: "Denied Test", description: "Old Desc" },
        { transaction },
      );
      const regularUser = await db.User.create(
        { email: "user@test.com", name: "User", roles: [] },
        { transaction },
      );

      let errorThrown = false;
      try {
        await updateOrgDescriptionImpl(
          regularUser,
          { id: org.id, description: "New Desc" },
          transaction,
        );
      } catch (e: any) {
        errorThrown = true;
        void expect(e.message).to.equal(`没有权限访问机构 ${org.id}。`);
      }
      void expect(errorThrown).to.be.true;
    });

    it("should throw not found error if org to update does not exist", async () => {
      const user = await db.User.create(
        { email: "user2@test.com", name: "User", roles: [] },
        { transaction },
      );
      let errorThrown = false;
      try {
        await updateOrgDescriptionImpl(
          user,
          { id: "00000000-0000-0000-0000-000000000000", description: "Desc" },
          transaction,
        );
      } catch (e: any) {
        errorThrown = true;
        void expect(e.message).to.equal(
          "机构 00000000-0000-0000-0000-000000000000 不存在。",
        );
      }
      void expect(errorThrown).to.be.true;
    });
  });

  describe("joinOrgImpl and leaveOrgImpl", () => {
    it("should allow a mentor to join and leave an org", async () => {
      const org = await db.Org.create(
        { name: "Join Leave Org" },
        { transaction },
      );
      const mentor = await db.User.create(
        { email: "mentor@test.com", name: "Mentor", roles: ["Mentor"] },
        { transaction },
      );

      await joinOrgImpl(mentor, org.id, transaction);

      let mentorAssoc = await db.OrgMentor.findOne({
        where: { orgId: org.id, mentorId: mentor.id },
        transaction,
      });
      void expect(mentorAssoc).to.not.be.null;

      await leaveOrgImpl(mentor, org.id, transaction);

      mentorAssoc = await db.OrgMentor.findOne({
        where: { orgId: org.id, mentorId: mentor.id },
        transaction,
      });
      void expect(mentorAssoc).to.be.null;
    });
  });

  describe("removeMentorImpl", () => {
    it("should allow an OrgAdmin to remove a mentor", async () => {
      const org = await db.Org.create(
        { name: "Remove Mentor Org" },
        { transaction },
      );
      const admin = await db.User.create(
        { email: "admin2@test.com", name: "Admin", roles: ["OrgAdmin"] },
        { transaction },
      );
      const mentor = await db.User.create(
        { email: "mentor2@test.com", name: "Mentor", roles: ["Mentor"] },
        { transaction },
      );

      await db.OrgMentor.create(
        { orgId: org.id, mentorId: mentor.id },
        { transaction },
      );

      await removeMentorImpl(
        admin,
        { orgId: org.id, mentorId: mentor.id },
        transaction,
      );

      const mentorAssoc = await db.OrgMentor.findOne({
        where: { orgId: org.id, mentorId: mentor.id },
        transaction,
      });
      void expect(mentorAssoc).to.be.null;
    });

    it("should allow an OrgOwner to remove a mentor", async () => {
      const org = await db.Org.create(
        { name: "Remove Mentor Owner Org" },
        { transaction },
      );
      const owner = await db.User.create(
        { email: "owner2@test.com", name: "Owner", roles: [] },
        { transaction },
      );
      const mentor = await db.User.create(
        { email: "mentor3@test.com", name: "Mentor", roles: ["Mentor"] },
        { transaction },
      );

      await db.OrgOwner.create(
        { orgId: org.id, ownerId: owner.id },
        { transaction },
      );
      await db.OrgMentor.create(
        { orgId: org.id, mentorId: mentor.id },
        { transaction },
      );

      await removeMentorImpl(
        owner,
        { orgId: org.id, mentorId: mentor.id },
        transaction,
      );

      const mentorAssoc = await db.OrgMentor.findOne({
        where: { orgId: org.id, mentorId: mentor.id },
        transaction,
      });
      void expect(mentorAssoc).to.be.null;
    });

    it("should deny removing a mentor if not an admin or owner", async () => {
      const org = await db.Org.create(
        { name: "Denied Remove Mentor Org" },
        { transaction },
      );
      const regularUser = await db.User.create(
        { email: "user3@test.com", name: "User", roles: [] },
        { transaction },
      );
      const mentor = await db.User.create(
        { email: "mentor4@test.com", name: "Mentor", roles: ["Mentor"] },
        { transaction },
      );

      await db.OrgMentor.create(
        { orgId: org.id, mentorId: mentor.id },
        { transaction },
      );

      let errorThrown = false;
      try {
        await removeMentorImpl(
          regularUser,
          { orgId: org.id, mentorId: mentor.id },
          transaction,
        );
      } catch (e: any) {
        errorThrown = true;
        void expect(e.message).to.equal(`没有权限访问机构 ${org.id}。`);
      }
      void expect(errorThrown).to.be.true;
    });
  });

  describe("addOwnerImpl and removeOwnerImpl", () => {
    it("should add and remove an owner", async () => {
      const org = await db.Org.create({ name: "Owner Org" }, { transaction });
      const user = await db.User.create(
        { email: "future_owner@test.com", name: "Future Owner", roles: [] },
        { transaction },
      );

      await addOwnerImpl({ orgId: org.id, ownerId: user.id }, transaction);

      let ownerAssoc = await db.OrgOwner.findOne({
        where: { orgId: org.id, ownerId: user.id },
        transaction,
      });
      void expect(ownerAssoc).to.not.be.null;

      await removeOwnerImpl({ orgId: org.id, ownerId: user.id }, transaction);

      ownerAssoc = await db.OrgOwner.findOne({
        where: { orgId: org.id, ownerId: user.id },
        transaction,
      });
      void expect(ownerAssoc).to.be.null;
    });
  });
});
