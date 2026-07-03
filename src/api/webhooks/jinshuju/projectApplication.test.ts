import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../../database/db";
import sequelize from "../../database/sequelize";
import crypto from "crypto";
import { submitProjectApp } from "./projectApplication";
import { getWhiteLabel } from "shared/getWhiteLabel";
import { encodeXField } from "../../jinshuju";

describe("Project Applications Webhook", () => {
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

  it("should create a project application", async () => {
    const owner = await createTestUser();
    const applicant = await createTestUser();
    const project = await createTestProject(owner.id);

    const xField = encodeXField(
      getWhiteLabel(),
      "url",
      applicant.id,
      project.id,
    );

    const entry = {
      x_field_1: xField,
      field_172: "111",
      field_113: "test@example.com",
    };

    await submitProjectApp(entry, transaction);

    const app = await db.ProjectApplication.findOne({
      where: { projectId: project.id, userId: applicant.id },
      transaction,
    });

    void expect(app).to.exist;
    expect(app?.application["身份证"]).to.equal("111");
    expect(app?.application["邮箱"]).to.equal("test@example.com");
  });
});
