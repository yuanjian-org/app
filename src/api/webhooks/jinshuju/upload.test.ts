import { expect } from "chai";
import sinon from "sinon";
import { Transaction } from "sequelize";
import db from "../../database/db";
import sequelize from "../../database/sequelize";
import { getWhiteLabel } from "../../getWhiteLabel";
import submit from "./upload";
import { TRPCError } from "@trpc/server";
import { encodeXField } from "../../../shared/jinshuju";
import { calculateMediaHmac } from "../../utils/jinshujuHmac";
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
    const entry = {
      field_1: ["url1", "url2"],
      x_field_1: `${getWhiteLabel()},test,UserProfilePicture,user-id,hmac`,
    };

    let error: any;
    try {
      await submit(entry);
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
      await submit(entry);
    } catch (e) {
      error = e;
    }

    expect(error).to.be.instanceOf(TRPCError);
    expect(error.code).to.equal("BAD_REQUEST");
    expect(error.message).to.include("Empty or malformed x_field_1");
  });

  it("should fail on invalid token data (missing target)", async () => {
    const entry = {
      field_1: ["url1"],
      x_field_1: `${getWhiteLabel()},test,,user-id,hmac`,
    };

    let error: any;
    try {
      await submit(entry);
    } catch (e) {
      error = e;
    }

    expect(error).to.be.instanceOf(TRPCError);
    expect(error.code).to.equal("BAD_REQUEST");
    expect(error.message).to.include("Invalid target, userId, or hmac");
  });

  it("should fail on non-existent user", async () => {
    const xField = encodeXField(
      getWhiteLabel(),
      "nonexistent-user",
      "UserProfilePicture",
      uuidv4(),
      "hmac",
    );
    const entry = {
      field_1: ["url1"],
      x_field_1: xField,
    };

    let error: any;
    try {
      await submit(entry);
    } catch (e) {
      error = e;
    }

    expect(error).to.be.instanceOf(TRPCError);
    expect(error.code).to.equal("NOT_FOUND");
  });

  it("should fail on checksum mismatch", async () => {
    const user = await db.User.create(
      {
        id: uuidv4(),
        url: "test-user-mismatch",
        profile: { 姓名: "Test User" },
      },
      { transaction },
    );

    const xField = encodeXField(
      getWhiteLabel(),
      user.url,
      "UserProfilePicture",
      user.id,
      "wrong-hmac",
    );
    const entry = {
      field_1: ["url1"],
      x_field_1: xField,
    };

    let error: any;
    try {
      await submit(entry);
    } catch (e) {
      error = e;
    }

    expect(error).to.be.instanceOf(TRPCError);
    expect(error.code).to.equal("BAD_REQUEST");
    expect(error.message).to.include("HMAC checksum mismatch");
  });

  it("should successfully update user profile picture", async () => {
    const user = await db.User.create(
      {
        id: uuidv4(),
        url: "test-user-picture",
        profile: { 姓名: "Test User" },
      },
      { transaction },
    );

    // We get the actual local profile and hmac from DB because create stringify might change it.
    const createdUser = await db.User.findByPk(user.id, { transaction });
    const localProfile = createdUser!.profile || {};
    const hmac = calculateMediaHmac(user.id, localProfile["照片链接"]);

    const xField = encodeXField(
      getWhiteLabel(),
      user.url,
      "UserProfilePicture",
      user.id,
      hmac,
    );
    const testUrl = "https://example.com/pic.jpg";
    const entry = {
      field_1: [testUrl],
      x_field_1: xField,
    };

    await submit(entry);

    const updatedUser = await db.User.findByPk(user.id, { transaction });
    expect(updatedUser!.profile!["照片链接"]).to.equal(testUrl);
  });

  it("should successfully update user profile video", async () => {
    const user = await db.User.create(
      {
        id: uuidv4(),
        url: "test-user-video",
        profile: { 姓名: "Test User 2" },
      },
      { transaction },
    );

    const createdUser = await db.User.findByPk(user.id, { transaction });
    const localProfile = createdUser!.profile || {};
    const hmac = calculateMediaHmac(user.id, localProfile["视频链接"]);

    const xField = encodeXField(
      getWhiteLabel(),
      user.url,
      "UserProfileVideo",
      user.id,
      hmac,
    );
    const testUrl = "https://example.com/video.mp4";
    const entry = {
      field_1: [testUrl],
      x_field_1: xField,
    };

    await submit(entry);

    const updatedUser = await db.User.findByPk(user.id, { transaction });
    expect(updatedUser!.profile!["视频链接"]).to.equal(testUrl);
  });
});
