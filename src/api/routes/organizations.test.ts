import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import {
  createOrganization,
  updateOrganizationDescription,
  joinOrganization,
  leaveOrganization,
  removeMentorFromOrganization,
  addOrganizationOwner,
  removeOrganizationOwner,
  removeOrganization,
  getOrganization,
  listOrganizations,
} from "./organizations";
import Role from "shared/Role";

describe("organizations", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  async function createTestUser(name: string, roles: Role[] = []) {
    return await db.User.create(
      {
        email: `${name.toLowerCase().replace(/ /g, ".")}@test.com`,
        name,
        roles,
      },
      { transaction },
    );
  }

  it("should create and list organizations", async () => {
    const org1 = await createOrganization(
      { name: "Org 1", description: "Desc 1" },
      transaction,
    );
    const org2 = await createOrganization(
      { name: "Org 2", description: "Desc 2" },
      transaction,
    );

    const list = await listOrganizations(transaction);

    // Filter to only include the ones we created to avoid interference from existing data
    const filteredList = list.filter(
      (o) => o.id === org1.id || o.id === org2.id,
    );

    expect(filteredList).to.have.length(2);
    expect(filteredList[0].name).to.equal("Org 1");
    expect(filteredList[1].name).to.equal("Org 2");
  });

  it("should get organization with members", async () => {
    const mentor = await createTestUser("Mentor", ["Mentor"]);
    const owner = await createTestUser("Owner", ["Volunteer"]);
    const org = await createOrganization(
      { name: "Test Org", description: "Test Desc" },
      transaction,
    );

    await joinOrganization(mentor.id, org.id, transaction);
    await addOrganizationOwner(org.id, owner.id, transaction);

    const fetchedOrg = await getOrganization(org.id, transaction);
    expect(fetchedOrg.name).to.equal("Test Org");
    expect(fetchedOrg.mentors).to.have.length(1);
    expect(fetchedOrg.mentors[0].id).to.equal(mentor.id);
    expect(fetchedOrg.owners).to.have.length(1);
    expect(fetchedOrg.owners[0].id).to.equal(owner.id);
  });

  it("should remove organization", async () => {
    const org = await createOrganization(
      { name: "To Remove", description: "Desc" },
      transaction,
    );
    await removeOrganization(org.id, transaction);

    try {
      await getOrganization(org.id, transaction);
      expect.fail("Should have thrown not found error");
    } catch (e: any) {
      expect(e.message).to.contain("未找到机构");
    }
  });

  describe("updateOrganizationDescription", () => {
    it("should allow OrgAdmin to update description", async () => {
      const admin = await createTestUser("Admin", ["OrgAdmin"]);
      const org = await createOrganization(
        { name: "Org", description: "Old" },
        transaction,
      );

      await updateOrganizationDescription(
        admin,
        org.id,
        "New Desc",
        transaction,
      );

      const updated = await getOrganization(org.id, transaction);
      expect(updated.description).to.equal("New Desc");
    });

    it("should allow owner to update description", async () => {
      const owner = await createTestUser("Owner", ["Volunteer"]);
      const org = await createOrganization(
        { name: "Org", description: "Old" },
        transaction,
      );
      await addOrganizationOwner(org.id, owner.id, transaction);

      await updateOrganizationDescription(
        owner,
        org.id,
        "New Desc",
        transaction,
      );

      const updated = await getOrganization(org.id, transaction);
      expect(updated.description).to.equal("New Desc");
    });

    it("should NOT allow others to update description", async () => {
      const other = await createTestUser("Other", ["Volunteer"]);
      const org = await createOrganization(
        { name: "Org", description: "Old" },
        transaction,
      );

      try {
        await updateOrganizationDescription(
          other,
          org.id,
          "New Desc",
          transaction,
        );
        expect.fail("Should have thrown forbidden error");
      } catch (e: any) {
        expect(e.message).to.contain("禁止访问机构");
      }
    });
  });

  it("should allow mentor to join and leave", async () => {
    const mentor = await createTestUser("Mentor", ["Mentor"]);
    const org = await createOrganization(
      { name: "Org", description: "Desc" },
      transaction,
    );

    await joinOrganization(mentor.id, org.id, transaction);
    let fetched = await getOrganization(org.id, transaction);
    expect(fetched.mentors).to.have.length(1);

    await leaveOrganization(mentor.id, org.id, transaction);
    fetched = await getOrganization(org.id, transaction);
    expect(fetched.mentors).to.have.length(0);
  });

  it("should allow owner to remove mentor", async () => {
    const owner = await createTestUser("Owner", ["Volunteer"]);
    const mentor = await createTestUser("Mentor", ["Mentor"]);
    const org = await createOrganization(
      { name: "Org", description: "Desc" },
      transaction,
    );
    await addOrganizationOwner(org.id, owner.id, transaction);
    await joinOrganization(mentor.id, org.id, transaction);

    await removeMentorFromOrganization(owner, org.id, mentor.id, transaction);
    const fetched = await getOrganization(org.id, transaction);
    expect(fetched.mentors).to.have.length(0);
  });

  it("should allow OrgAdmin to manage owners", async () => {
    const org = await createOrganization(
      { name: "Org", description: "Desc" },
      transaction,
    );
    const owner = await createTestUser("Owner", ["Volunteer"]);

    await addOrganizationOwner(org.id, owner.id, transaction);
    let fetched = await getOrganization(org.id, transaction);
    expect(fetched.owners).to.have.length(1);

    await removeOrganizationOwner(org.id, owner.id, transaction);
    fetched = await getOrganization(org.id, transaction);
    expect(fetched.owners).to.have.length(0);
  });
});
