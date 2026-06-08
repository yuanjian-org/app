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
    visibility: "Public" | "Confidential" = "Public",
    status: "Draft" | "Open" | "Closed" = "Open",
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
    it("should return projects owned by me", async () => {
      const me = await createTestUser();
      const project1 = await createTestProject(me.id, "Confidential", "Draft");
      const project2 = await createTestProject(me.id, "Public", "Open");

      const otherUser = await createTestUser();
      await createTestProject(otherUser.id, "Confidential", "Draft"); // shouldn't see

      const projects = await listImpl(me, transaction);
      const projectIds = projects.map((p) => p.id);

      expect(projectIds).to.include(project1.id);
      expect(projectIds).to.include(project2.id);
    });

    it("should return public/open projects even if not owned by me", async () => {
      const me = await createTestUser();
      const otherUser = await createTestUser();

      const project1 = await createTestProject(otherUser.id, "Public", "Open");

      const projects = await listImpl(me, transaction);
      const projectIds = projects.map((p) => p.id);

      expect(projectIds).to.include(project1.id);
    });

    it("should allow ProjectAdmin to see all projects regardless of status or ownership", async () => {
      const admin = await createTestUser(["ProjectAdmin"]);
      const otherUser = await createTestUser();

      const project1 = await createTestProject(
        otherUser.id,
        "Confidential",
        "Draft",
      );

      const projects = await listImpl(admin, transaction);
      const projectIds = projects.map((p) => p.id);

      expect(projectIds).to.include(project1.id);
    });
  });

  describe("getImpl", () => {
    it("should get a public/open project", async () => {
      const me = await createTestUser();
      const otherUser = await createTestUser();
      const project = await createTestProject(otherUser.id, "Public", "Open");

      const result = await getImpl(me, { id: project.id }, transaction);
      expect(result.id).to.equal(project.id);
    });

    it("should get an owned project regardless of status", async () => {
      const me = await createTestUser();
      const project = await createTestProject(me.id, "Confidential", "Draft");

      const result = await getImpl(me, { id: project.id }, transaction);
      expect(result.id).to.equal(project.id);
    });

    it("should allow ProjectAdmin to get any project", async () => {
      const admin = await createTestUser(["ProjectAdmin"]);
      const otherUser = await createTestUser();
      const project = await createTestProject(
        otherUser.id,
        "Confidential",
        "Draft",
      );

      const result = await getImpl(admin, { id: project.id }, transaction);
      expect(result.id).to.equal(project.id);
    });

    it("should throw notFoundError for a non-existent project id", async () => {
      const me = await createTestUser();

      let error: any;
      try {
        await getImpl(me, { id: uuidv4() }, transaction);
      } catch (e) {
        error = e;
      }

      expect(error.code).to.equal("NOT_FOUND");
    });

    it("should throw noPermissionError for an unowned private/draft project", async () => {
      const me = await createTestUser();
      const otherUser = await createTestUser();
      const project = await createTestProject(
        otherUser.id,
        "Confidential",
        "Draft",
      );

      let error: any;
      try {
        await getImpl(me, { id: project.id }, transaction);
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
        {
          title: "New Project",
          status: "Draft",
          visibility: "Confidential",
          profile: {},
        },
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
        {
          title: "Admin Created Project",
          status: "Draft",
          visibility: "Confidential",
          profile: {},
          ownerId: otherUser.id,
        },
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
          {
            title: "Hacked Project",
            status: "Draft",
            visibility: "Confidential",
            profile: {},
            ownerId: otherUser.id,
          },
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
        {
          id: project.id,
          title: "Updated Title",
        },
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
        {
          id: project.id,
          title: "Admin Updated Title",
        },
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
          {
            id: project.id,
            title: "Hacked Title",
          },
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
          {
            id: uuidv4(),
            title: "Ghost Project",
          },
          transaction,
        );
      } catch (e) {
        error = e;
      }

      expect(error.code).to.equal("NOT_FOUND");
    });
  });
});
