import { whiteLabel } from "shared/WhiteLabel";
import { expect } from "chai";
import sinon from "sinon";
import { Transaction } from "sequelize";
import db from "../../database/db";
import sequelize from "../../database/sequelize";
import submit from "./upload";
import { TRPCError } from "@trpc/server";
import { encodeXField } from "../../jinshuju";
import { v4 as uuidv4 } from "uuid";

describe("upload webhook", () => {
  let transaction: Transaction;
  let originalSecret: string | undefined;

  beforeEach(async () => {
    originalSecret = process.env.NEXTAUTH_SECRET;
    process.env.NEXTAUTH_SECRET = "test-secret";

    transaction = await sequelize.transaction();
    sinon.stub(sequelize, "transaction").callsFake((cb) => {
      // @ts-ignore
      return cb(transaction);
    });
  });

  afterEach(async () => {
    process.env.NEXTAUTH_SECRET = originalSecret;
    sinon.restore();
    await transaction.rollback();
  });

  it("should fail if # urls isn't one", async () => {
    const createdUser = await db.User.create(
      {
        id: uuidv4(),
        name: "Test User",
        email: `test-${uuidv4()}@example.com`,
      },
      { transaction },
    );
    const token = encodeXField(whiteLabel, "test", createdUser.id, "user");
    const entry = {
      field_1: ["url1", "url2"],
      x_field_1: token,
    };

    let error: any;
    try {
      await submit("Bz3uSO", entry);
    } catch (e) {
      error = e;
    }

    expect(error).to.be.instanceOf(TRPCError);
    expect(error.code).to.equal("BAD_REQUEST");
    expect(error.message).to.include("# urls isn't one");
  });

  it("should fail if x_field_1 is malformed", async () => {
    const entry = {
      field_1: ["url1"],
      x_field_1: "malformed",
    };

    let error: any;
    try {
      await submit("Bz3uSO", entry);
    } catch (e) {
      error = e;
    }

    expect(error).to.be.instanceOf(TRPCError);
    expect(error.code).to.equal("BAD_REQUEST");
    expect(error.message).to.include("Malformed x_field_1");
  });

  it("should fail on invalid token HMAC", async () => {
    const token = encodeXField(whiteLabel, "url", uuidv4());
    const entry = {
      field_1: ["url1"],
      x_field_1: token + "tampered",
    };

    let error: any;
    try {
      await submit("Bz3uSO", entry);
    } catch (e) {
      error = e;
    }

    expect(error).to.be.instanceOf(TRPCError);
    expect(error.code).to.equal("BAD_REQUEST");
    expect(error.message).to.include("Invalid HMAC in x_field_1");
  });

  it("should fail for unknown form id", async () => {
    const user = await db.User.create(
      {
        id: uuidv4(),
        name: "Test User",
        email: `test-${uuidv4()}@example.com`,
      },
      { transaction },
    );

    const token = encodeXField(whiteLabel, "test", user.id, "user");
    const entry = {
      field_1: ["url1"],
      x_field_1: token,
    };

    let error: any;
    try {
      await submit("UnknownForm", entry);
    } catch (e) {
      error = e;
    }

    expect(error).to.be.instanceOf(TRPCError);
    expect(error.code).to.equal("BAD_REQUEST");
    expect(error.message).to.include("Unknown upload form");
  });

  it("should succeed for picture form", async () => {
    const createdUser = await db.User.create(
      {
        id: uuidv4(),
        name: "Test User",
        email: `test-${uuidv4()}@example.com`,
        profile: {
          照片链接: "old-pic",
        },
      },
      { transaction },
    );
    const user = createdUser!;

    const token = encodeXField(whiteLabel, "test", user.id, "user");
    const testUrl = "https://example.com/pic.jpg";
    const entry = {
      field_1: [testUrl],
      x_field_1: token,
    };

    await submit("Bz3uSO", entry);

    const updatedUser = await db.User.findByPk(user.id, { transaction });
    expect(updatedUser!.profile!["照片链接"]).to.equal(testUrl);
  });

  it("should succeed for video form", async () => {
    const createdUser = await db.User.create(
      {
        id: uuidv4(),
        name: "Test User",
        email: `test-${uuidv4()}@example.com`,
        profile: {
          视频链接: "old-video",
        },
      },
      { transaction },
    );
    const user = createdUser!;

    const token = encodeXField(whiteLabel, "test", user.id, "user");
    const testUrl = "https://example.com/video.mp4";
    const entry = {
      field_1: [testUrl],
      x_field_1: token,
    };

    await submit("nhFsf1", entry);

    const updatedUser = await db.User.findByPk(user.id, { transaction });
    expect(updatedUser!.profile!["视频链接"]).to.equal(testUrl);
  });

  it("should succeed for project form", async () => {
    const createdUser = await db.User.create(
      {
        id: uuidv4(),
        name: "Test User",
        email: `test-${uuidv4()}@example.com`,
      },
      { transaction },
    );
    const user = createdUser!;

    const createdProject = await db.Project.create(
      {
        id: uuidv4(),
        whiteLabel,
        name: "Test Project",
        title: "Test Project Title",
        ownerId: user.id,
        visibility: "Public",
        status: "Active",
        profile: {
          视频链接: "old-video",
        },
      },
      { transaction },
    );
    const project = createdProject!;

    const token = encodeXField(
      whiteLabel,
      "test",
      user.id,
      "project",
      project.id,
    );
    const testUrl = "https://example.com/project-video.mp4";
    const entry = {
      field_1: [testUrl],
      x_field_1: token,
    };

    await submit("nhFsf1", entry);

    const updatedProject = await db.Project.findByPk(project.id, {
      transaction,
    });
    expect(updatedProject!.profile!["视频链接"]).to.equal(testUrl);
  });

  it("should succeed for reference materials form with multiple files", async () => {
    const createdUser = await db.User.create(
      {
        id: uuidv4(),
        name: "Test User",
        email: `test-${uuidv4()}@example.com`,
      },
      { transaction },
    );
    const user = createdUser!;

    const createdProject = await db.Project.create(
      {
        id: uuidv4(),
        whiteLabel,
        name: "Test Project",
        title: "Test Project Title",
        ownerId: user.id,
        visibility: "Public",
        status: "Active",
      },
      { transaction },
    );
    const project = createdProject!;

    const token = encodeXField(
      whiteLabel,
      "test",
      user.id,
      "project",
      project.id,
    );
    const urls = [
      "https://example.com/file1.pdf",
      "https://example.com/file2.zip",
    ];
    const entry = {
      field_1: urls,
      x_field_1: token,
    };

    await submit("zF1xqk", entry);

    const updatedProject = await db.Project.findByPk(project.id, {
      transaction,
    });
    expect(updatedProject!.profile!["参考材料"]).to.equal(
      "- [参考材料 1](https://example.com/file1.pdf)\n- [参考材料 2](https://example.com/file2.zip)",
    );
  });
});
