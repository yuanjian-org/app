import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import User from "../../shared/User";
import { listImpl, getImpl, createImpl, updateImpl } from "./projects";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

describe("Projects Route Impl", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  const createTestUser = async (roles: string[] = []): Promise<User> => {
    const user = await db.User.create(
      {
        email: `${crypto.randomUUID()}@example.com`,
        name: "Test User",
        roles,
      },
      { transaction },
    );
    return user.toJSON() as User;
  };

  const createTestProject = async (
    ownerId: string,
    visibility: "公开" | "保密" = "公开",
    status: "草稿" | "招募中" | "已结束" = "招募中",
  ) => {
    return await db.Project.create(
      {
        ownerId,
        title: "Test Project",
        status,
        visibility,
        profile: {},
      },
      { transaction },
    );
  };

  describe("listImpl", () => {
    it("should return public/open projects when me is undefined", async () => {
      const otherUser = await createTestUser();
      const project1 = await createTestProject(otherUser.id, "公开", "招募中");
      const project2 = await createTestProject(otherUser.id, "保密", "草稿");

      const result = await listImpl(undefined, transaction);
      expect(result).to.be.an("array");
      expect(result.map((r) => r.id)).to.include(project1.id);
      expect(result.map((r) => r.id)).to.not.include(project2.id);
    });
    it("should return projects owned by me", async () => {
      const me = await createTestUser();
      const project1 = await createTestProject(me.id, "保密", "草稿");
      const project2 = await createTestProject(me.id, "公开", "招募中");

      const otherUser = await createTestUser();
      await createTestProject(otherUser.id, "保密", "草稿"); // shouldn't see

      const projects = await listImpl(me, transaction);
      const projectIds = projects.map((p) => p.id);

      expect(projectIds).to.include(project1.id);
      expect(projectIds).to.include(project2.id);
    });

    it("should return public/open projects even if not owned by me", async () => {
      const me = await createTestUser();
      const otherUser = await createTestUser();

      const project1 = await createTestProject(otherUser.id, "公开", "招募中");

      const projects = await listImpl(me, transaction);
      const projectIds = projects.map((p) => p.id);

      expect(projectIds).to.include(project1.id);
    });

    it("should allow ProjectAdmin to see all projects regardless of status or ownership", async () => {
      const admin = await createTestUser(["ProjectAdmin"]);
      const otherUser = await createTestUser();

      const project1 = await createTestProject(otherUser.id, "保密", "草稿");

      const projects = await listImpl(admin, transaction);
      const projectIds = projects.map((p) => p.id);

      expect(projectIds).to.include(project1.id);
    });
  });

  describe("getImpl", () => {
    it("should get a public/open project when me is undefined", async () => {
      const otherUser = await createTestUser();
      const project1 = await createTestProject(otherUser.id, "公开", "招募中");

      const result = await getImpl(undefined, project1.id, transaction);
      void expect(result).to.exist;
      expect(result.id).to.equal(project1.id);
    });

    it("should throw noPermissionError when me is undefined and project is not public/open", async () => {
      const otherUser = await createTestUser();
      const project2 = await createTestProject(otherUser.id, "保密", "草稿");

      try {
        await getImpl(undefined, project2.id, transaction);
        expect.fail("Should have thrown noPermissionError");
      } catch (error: any) {
        expect(error.code).to.equal("FORBIDDEN");
      }
    });
    it("should get a public/open project", async () => {
      const me = await createTestUser();
      const otherUser = await createTestUser();
      const project = await createTestProject(otherUser.id, "公开", "招募中");

      const result = await getImpl(me, project.id, transaction);
      expect(result.id).to.equal(project.id);
    });

    it("should get an owned project regardless of status", async () => {
      const me = await createTestUser();
      const project = await createTestProject(me.id, "保密", "草稿");

      const result = await getImpl(me, project.id, transaction);
      expect(result.id).to.equal(project.id);
    });

    it("should allow ProjectAdmin to get any project", async () => {
      const admin = await createTestUser(["ProjectAdmin"]);
      const otherUser = await createTestUser();
      const project = await createTestProject(otherUser.id, "保密", "草稿");

      const result = await getImpl(admin, project.id, transaction);
      expect(result.id).to.equal(project.id);
    });

    it("should throw notFoundError for a non-existent project id", async () => {
      const me = await createTestUser();

      let error: any;
      try {
        await getImpl(me, uuidv4(), transaction);
      } catch (e) {
        error = e;
      }

      expect(error.code).to.equal("NOT_FOUND");
    });

    it("should throw noPermissionError for an unowned private/draft project", async () => {
      const me = await createTestUser();
      const otherUser = await createTestUser();
      const project = await createTestProject(otherUser.id, "保密", "草稿");

      let error: any;
      try {
        await getImpl(me, project.id, transaction);
      } catch (e) {
        error = e;
      }

      expect(error.code).to.equal("FORBIDDEN");
    });
  });

  describe("createImpl", () => {
    it("should create a project successfully by its owner", async () => {
      const me = await createTestUser();

      const project = await createImpl(
        me,
        "New Project",
        "草稿",
        "保密",
        {},
        undefined,
        transaction,
      );

      expect(project.title).to.equal("New Project");
      expect(project.ownerId).to.equal(me.id);
    });

    it("should allow ProjectAdmin to create a project for another user", async () => {
      const admin = await createTestUser(["ProjectAdmin"]);
      const otherUser = await createTestUser();

      const project = await createImpl(
        admin,
        "Admin Created Project",
        "草稿",
        "保密",
        {},
        otherUser.id,
        transaction,
      );

      expect(project.ownerId).to.equal(otherUser.id);
    });

    it("should throw noPermissionError when a non-admin tries to create a project for another user", async () => {
      const me = await createTestUser();
      const otherUser = await createTestUser();

      let error: any;
      try {
        await createImpl(
          me,
          "Hacked Project",
          "草稿",
          "保密",
          {},
          otherUser.id,
          transaction,
        );
      } catch (e) {
        error = e;
      }

      expect(error.code).to.equal("FORBIDDEN");
    });
  });

  describe("updateImpl", () => {
    it("should update an owned project successfully", async () => {
      const me = await createTestUser();
      const project = await createTestProject(me.id);

      const updatedProject = await updateImpl(
        me,
        project.id,
        "Updated Title",
        undefined,
        undefined,
        undefined,
        undefined,
        transaction,
      );

      expect(updatedProject.title).to.equal("Updated Title");
    });

    it("should allow ProjectAdmin to update any project successfully", async () => {
      const admin = await createTestUser(["ProjectAdmin"]);
      const otherUser = await createTestUser();
      const project = await createTestProject(otherUser.id);

      const updatedProject = await updateImpl(
        admin,
        project.id,
        "Admin Updated Title",
        undefined,
        undefined,
        undefined,
        undefined,
        transaction,
      );

      expect(updatedProject.title).to.equal("Admin Updated Title");
    });

    it("should throw noPermissionError when non-admin tries to update another user's project", async () => {
      const me = await createTestUser();
      const otherUser = await createTestUser();
      const project = await createTestProject(otherUser.id);

      let error: any;
      try {
        await updateImpl(
          me,
          project.id,
          "Hacked Title",
          undefined,
          undefined,
          undefined,
          undefined,
          transaction,
        );
      } catch (e) {
        error = e;
      }

      expect(error.code).to.equal("FORBIDDEN");
    });

    it("should throw notFoundError for a non-existent project id", async () => {
      const me = await createTestUser();

      let error: any;
      try {
        await updateImpl(
          me,
          uuidv4(),
          "Ghost Project",
          undefined,
          undefined,
          undefined,
          undefined,
          transaction,
        );
      } catch (e) {
        error = e;
      }

      expect(error.code).to.equal("NOT_FOUND");
    });
  });
});
