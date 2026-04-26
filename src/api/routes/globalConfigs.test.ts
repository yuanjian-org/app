import { expect } from "chai";
import { getStaticImpl, getImpl, updateImpl } from "./globalConfigs";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";
import { isDemo as isDemoFlag } from "../../shared/isDemo";

describe("Global Configs Internal Functions", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
    // Ensure no rows exist for isolated testing
    await db.GlobalConfig.destroy({ where: {}, transaction });
  });

  afterEach(async () => {
    if (transaction) {
      await transaction.rollback();
    }
  });

  describe("getStaticImpl", () => {
    it("should return static configuration values including isDemo, enableOrgs, and whiteLabel", () => {
      const result = getStaticImpl();
      expect(result.isDemo).to.equal(isDemoFlag());
      expect(result.enableOrgs).to.equal(process.env.ENABLE_ORGS === "true");
      expect(result.whiteLabel).to.equal(process.env.WHITE_LABEL);
    });
  });

  describe("getImpl", () => {
    it("should return an empty object when no config exists in the database", async () => {
      const result = await getImpl(transaction);
      expect(result).to.deep.equal({});
    });

    it("should return the stored configuration data when it exists", async () => {
      const testData = { showEditMessageTimeButton: true };
      await db.GlobalConfig.create({ data: testData }, { transaction });

      const result = await getImpl(transaction);
      expect(result).to.deep.equal(testData);
    });
  });

  describe("updateImpl", () => {
    it("should create a new row if one doesn't exist and save the correct input", async () => {
      const input = { showEditMessageTimeButton: true };
      await updateImpl(input, transaction);

      const configs = await db.GlobalConfig.findAll({ transaction });
      expect(configs).to.have.lengthOf(1);
      expect(configs[0].data).to.deep.equal({
        showEditMessageTimeButton: true,
      });
    });

    it("should merge with existing configuration data and ignore undefined fields", async () => {
      const initialData = { showEditMessageTimeButton: true };
      await db.GlobalConfig.create({ data: initialData }, { transaction });

      const mockDate = "2023-01-01T00:00:00.000Z";
      const input = {
        matchFeedbackEditableUntil: mockDate,
        showEditMessageTimeButton: undefined, // should be ignored
      };

      await updateImpl(input, transaction);

      const configs = await db.GlobalConfig.findAll({ transaction });
      expect(configs).to.have.lengthOf(1);
      expect(configs[0].data).to.deep.equal({
        showEditMessageTimeButton: true,
        matchFeedbackEditableUntil: mockDate,
      });
    });

    it("should remove showEditMessageTimeButton key entirely when explicitly set to false", async () => {
      const initialData = { showEditMessageTimeButton: true };
      await db.GlobalConfig.create({ data: initialData }, { transaction });

      const input = { showEditMessageTimeButton: false };
      await updateImpl(input, transaction);

      const configs = await db.GlobalConfig.findAll({ transaction });
      expect(configs).to.have.lengthOf(1);
      expect(configs[0].data).to.deep.equal({});
    });
  });
});
