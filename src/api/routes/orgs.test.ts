import { expect } from "chai";
import db from "../database/db";
import { setupTestDB } from "../../tests/setup";
import orgsRouter from "./orgs";
import { createCallerFactory } from "../trpc";

describe("orgs routes", () => {
  setupTestDB();

  let adminUser: any;
  let mentorUser: any;
  const createCaller = createCallerFactory(orgsRouter);

  beforeEach(async () => {
    adminUser = await db.User.create({
      name: "Admin",
      email: "admin@example.com",
      roles: ["OrgAdmin"],
    });

    mentorUser = await db.User.create({
      name: "Mentor",
      email: "mentor@example.com",
      roles: ["Mentor"],
    });
  });

  afterEach(async () => {
    await db.OrgOwner.destroy({ truncate: true, cascade: true });
    await db.OrgMentor.destroy({ truncate: true, cascade: true });
    await db.Org.destroy({ truncate: true, cascade: true });
    await db.User.destroy({ truncate: true, cascade: true });
  });

  it("should create an org", async () => {
    const caller = createCaller({
      req: null as any,
      res: null as any,
      me: adminUser,
    });
    const newOrg = await caller.create({
      name: "Test Org",
      description: "Test Desc",
    });

    void expect(newOrg).to.not.be.undefined;
    expect(newOrg.name).to.equal("Test Org");
    expect(newOrg.description).to.equal("Test Desc");

    const dbOrg = await db.Org.findByPk(newOrg.id);
    void expect(dbOrg).to.not.be.null;
    expect(dbOrg!.name).to.equal("Test Org");
  });

  it("should remove an org", async () => {
    const org = await db.Org.create({
      name: "To be removed",
    });

    const caller = createCaller({
      req: null as any,
      res: null as any,
      me: adminUser,
    });
    await caller.remove(org.id);

    const dbOrg = await db.Org.findByPk(org.id);
    void expect(dbOrg).to.be.null;
  });

  it("should add an owner", async () => {
    const org = await db.Org.create({
      name: "Test Add Owner Org",
    });

    const caller = createCaller({
      req: null as any,
      res: null as any,
      me: adminUser,
    });
    await caller.addOwner({
      orgId: org.id,
      ownerId: mentorUser.id,
    });

    const ownerCount = await db.OrgOwner.count({
      where: { orgId: org.id, ownerId: mentorUser.id },
    });
    expect(ownerCount).to.equal(1);
  });

  it("should remove an owner", async () => {
    const org = await db.Org.create({
      name: "Test Remove Owner Org",
    });

    await db.OrgOwner.create({
      orgId: org.id,
      ownerId: mentorUser.id,
    });

    const caller = createCaller({
      req: null as any,
      res: null as any,
      me: adminUser,
    });
    await caller.removeOwner({
      orgId: org.id,
      ownerId: mentorUser.id,
    });

    const ownerCount = await db.OrgOwner.count({
      where: { orgId: org.id, ownerId: mentorUser.id },
    });
    expect(ownerCount).to.equal(0);
  });
});
