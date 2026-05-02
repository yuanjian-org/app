import { expect } from "chai";
import { TRPCError } from "@trpc/server";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import cronRouter from "./cron";

describe("cron", () => {
  let envBackup: NodeJS.ProcessEnv;
  let transaction: Transaction;

  beforeEach(async () => {
    envBackup = { ...process.env };
    transaction = await sequelize.transaction();
    process.env.INTEGRATION_AUTH_TOKEN = "integration_test_token";
  });

  afterEach(async () => {
    await transaction.rollback();
    process.env = envBackup;
  });

  describe("resetDemoData", () => {
    it("should throw if isDemo is false", async () => {
      // isDemo reads process.env.IS_DEMO
      process.env.IS_DEMO = "false";

      const caller = cronRouter.createCaller({
        req: {
          headers: {
            authorization: "Bearer " + process.env.INTEGRATION_AUTH_TOKEN,
          },
        },
      } as any);

      let error: any;
      try {
        await caller.resetDemoData();
      } catch (e) {
        error = e;
      }

      expect(error).to.exist;
      expect(error).to.be.instanceOf(TRPCError);
      expect(error.code).to.equal("FORBIDDEN");
      expect(error.message).to.include("数据");
    });
  });

  describe("authIntegration", () => {
    it("should throw BAD_REQUEST if token is invalid for cron routes", async () => {
      const caller = cronRouter.createCaller({
        req: { headers: { authorization: "Bearer invalid_token" } },
      } as any);

      let error: any;
      try {
        await caller.syncMeetings();
      } catch (e) {
        error = e;
      }

      expect(error).to.exist;
      expect(error).to.be.instanceOf(TRPCError);
      expect(error.code).to.equal("BAD_REQUEST");
    });
  });
});
