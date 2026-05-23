import { expect } from "chai";
import sinon from "sinon";
import { Transaction } from "sequelize";
import db from "../../database/db";
import sequelize from "../../database/sequelize";
import { getWhiteLabel } from "../../getWhiteLabel";
import submit from "./upload";
import { TRPCError } from "@trpc/server";
import { encodeUploadTokenUrlSafe } from "../../../shared/jinshuju";
import { shaChecksum } from "../../../shared/strings";
import { v4 as uuidv4 } from "uuid";

describe("upload webhook", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
    sinon.stub(sequelize, "transaction").callsFake((cb) => {
      // @ts-ignore
      return cb(transaction);
    });
  });

  afterEach(async () => {
    sinon.restore();
    await transaction.rollback();
  });

  it("should fail if # urls isn't one", async () => {
    const entry = {
      field_1: ["url1", "url2"],
      x_field_1: `${getWhiteLabel()},test,token`,
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

  it("should fail on invalid token data", async () => {
    const entry = {
      field_1: ["url1"],
      x_field_1: `${getWhiteLabel()},test,invalidBase64`,
    };

    let error: any;
    try {
      await submit(entry);
    } catch (e) {
      error = e;
    }

    expect(error).to.be.instanceOf(Error);
  });

  it("should fail on unknown upload target", async () => {
    const token = encodeUploadTokenUrlSafe(
      "UnknownTarget" as any,
      uuidv4(),
      "opaque1",
    );
    const entry = {
      field_1: ["url1"],
      x_field_1: `${getWhiteLabel()},test,${token}`,
    };

    let error: any;
    try {
      await submit(entry);
    } catch (e) {
      error = e;
    }

    expect(error).to.be.instanceOf(TRPCError);
    expect(error.code).to.equal("BAD_REQUEST");
    expect(error.message).to.include("Unknown upload target");
  });

  it("should fail on non-existent user", async () => {
    const token = encodeUploadTokenUrlSafe(
      "UserProfilePicture",
      uuidv4(),
      "opaque1",
    );
    const entry = {
      field_1: ["url1"],
      x_field_1: `${getWhiteLabel()},test,${token}`,
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
        profile: { 姓名: "Test User" },
      },
      { transaction },
    );

    const token = encodeUploadTokenUrlSafe(
      "UserProfilePicture",
      user.id,
      "wrong-sha",
    );
    const entry = {
      field_1: ["url1"],
      x_field_1: `${getWhiteLabel()},test,${token}`,
    };

    let error: any;
    try {
      await submit(entry);
    } catch (e) {
      error = e;
    }

    expect(error).to.be.instanceOf(TRPCError);
    expect(error.code).to.equal("BAD_REQUEST");
    expect(error.message).to.include("SHA checksum mismatch");
  });

  it("should successfully update user profile picture", async () => {
    const user = await db.User.create(
      {
        id: uuidv4(),
        profile: { 姓名: "Test User" },
      },
      { transaction },
    );

    // We get the actual local profile and sha from DB because create stringify might change it.
    const createdUser = await db.User.findByPk(user.id, { transaction });
    const localProfile = createdUser!.profile || {};
    const sha = shaChecksum(localProfile);

    const token = encodeUploadTokenUrlSafe("UserProfilePicture", user.id, sha);
    const testUrl = "https://example.com/pic.jpg";
    const entry = {
      field_1: [testUrl],
      x_field_1: `${getWhiteLabel()},test,${token}`,
    };

    await submit(entry);

    const updatedUser = await db.User.findByPk(user.id, { transaction });
    expect(updatedUser!.profile!["照片链接"]).to.equal(testUrl);
  });

  it("should successfully update user profile video", async () => {
    const user = await db.User.create(
      {
        id: uuidv4(),
        profile: { 姓名: "Test User 2" },
      },
      { transaction },
    );

    const createdUser = await db.User.findByPk(user.id, { transaction });
    const localProfile = createdUser!.profile || {};
    const sha = shaChecksum(localProfile);

    const token = encodeUploadTokenUrlSafe("UserProfileVideo", user.id, sha);
    const testUrl = "https://example.com/video.mp4";
    const entry = {
      field_1: [testUrl],
      x_field_1: `${getWhiteLabel()},test,${token}`,
    };

    await submit(entry);

    const updatedUser = await db.User.findByPk(user.id, { transaction });
    expect(updatedUser!.profile!["视频链接"]).to.equal(testUrl);
  });
});
