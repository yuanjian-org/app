import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import {
  listImpl,
  updateStatusImpl,
  checkProjectPermission,
} from "./projectApplications";
import crypto from "crypto";

describe("Project Applications Route Impl", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  const createTestUser = async (roles: string[] = []) => {
    return await db.User.create(
      {
        email: `${crypto.randomUUID()}@example.com`,
        name: "Test User",
        roles,
      },
      { transaction },
    );
  };

  const createTestProject = async (ownerId: string) => {
    return await db.Project.create(
      {
        ownerId,
        title: "Test Project",
        status: "招募中",
        visibility: "公开",
        profile: {},
      },
      { transaction },
    );
  };

  const createTestApp = async (projectId: string, userId: string) => {
    return await db.ProjectApplication.create(
      {
        projectId,
        userId,
        status: null,
        application: { test: 1 },
      },
      { transaction },
    );
  };

  it("should list applications for project owner", async () => {
    const owner = await createTestUser();
    const applicant = await createTestUser();
    const project = await createTestProject(owner.id);
    const app = await createTestApp(project.id, applicant.id);

    const result = await listImpl(owner as any, project.id, transaction);
    expect(result.length).to.equal(1);
    expect(result[0].id).to.equal(app.id);
    expect(result[0].user?.id).to.equal(applicant.id);
  });

  it("should block non-owners from listing applications", async () => {
    const owner = await createTestUser();
    const applicant = await createTestUser();
    const randomUser = await createTestUser();
    const project = await createTestProject(owner.id);
    await createTestApp(project.id, applicant.id);

    let error: any;
    try {
      await listImpl(randomUser as any, project.id, transaction);
    } catch (e) {
      error = e;
    }
    expect(error.code).to.equal("FORBIDDEN");
  });

  it("should allow ProjectAdmin to list applications", async () => {
    const owner = await createTestUser();
    const applicant = await createTestUser();
    const admin = await createTestUser(["ProjectAdmin"]);
    const project = await createTestProject(owner.id);
    const app = await createTestApp(project.id, applicant.id);

    const result = await listImpl(admin as any, project.id, transaction);
    expect(result.length).to.equal(1);
    expect(result[0].id).to.equal(app.id);
  });

  describe("checkProjectPermission", () => {
    it("should allow if user has ProjectAdmin role", async () => {
      const admin = await createTestUser(["ProjectAdmin"]);
      await checkProjectPermission(admin as any, "some-random-id", transaction);
      // should not throw
    });

    it("should throw NOT_FOUND if project doesn't exist", async () => {
      const randomUser = await createTestUser();
      let error: any;
      try {
        await checkProjectPermission(
          randomUser as any,
          "00000000-0000-0000-0000-000000000000",
          transaction,
        );
      } catch (e) {
        error = e;
      }
      expect(error.code).to.equal("NOT_FOUND");
    });

    it("should throw FORBIDDEN if user is not the owner", async () => {
      const owner = await createTestUser();
      const randomUser = await createTestUser();
      const project = await createTestProject(owner.id);

      let error: any;
      try {
        await checkProjectPermission(
          randomUser as any,
          project.id,
          transaction,
        );
      } catch (e) {
        error = e;
      }
      expect(error.code).to.equal("FORBIDDEN");
    });

    it("should not throw if user is the owner", async () => {
      const owner = await createTestUser();
      const project = await createTestProject(owner.id);

      await checkProjectPermission(owner as any, project.id, transaction);
      // should not throw
    });
  });

  describe("updateStatusImpl", () => {
    it("should throw NOT_FOUND if application doesn't exist", async () => {
      const owner = await createTestUser();
      let error: any;
      try {
        await updateStatusImpl(
          owner as any,
          "00000000-0000-0000-0000-000000000000",
          "已批准",
          transaction,
        );
      } catch (e) {
        error = e;
      }
      expect(error.code).to.equal("NOT_FOUND");
    });

    it("should throw FORBIDDEN if user is not the owner", async () => {
      const owner = await createTestUser();
      const randomUser = await createTestUser();
      const applicant = await createTestUser();
      const project = await createTestProject(owner.id);
      const app = await createTestApp(project.id, applicant.id);

      let error: any;
      try {
        await updateStatusImpl(
          randomUser as any,
          app.id,
          "已批准",
          transaction,
        );
      } catch (e) {
        error = e;
      }
      expect(error.code).to.equal("FORBIDDEN");
    });

    it("should update application status if user is owner", async () => {
      const owner = await createTestUser();
      const applicant = await createTestUser();
      const project = await createTestProject(owner.id);
      const app = await createTestApp(project.id, applicant.id);

      await updateStatusImpl(owner as any, app.id, "已批准", transaction);

      const updated = await db.ProjectApplication.findByPk(app.id, {
        transaction,
      });
      expect(updated?.status).to.equal("已批准");
    });
  });
});
