import db from "../database/db";
import sequelize from "../database/sequelize";
import { sendImpl } from "./idTokens";
import { checkAndDeleteIdToken } from "../../api/checkAndDeleteIdToken";
import { Transaction } from "sequelize";
import { expect } from "chai";
import * as smsModule from "../sms";
import * as emailModule from "../../api/email";
import * as tokenModule from "../../shared/token";
import sinon from "sinon";
import moment from "moment";
import { TRPCError } from "@trpc/server";

describe("IdToken Security", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
    sinon.stub(smsModule, "sms").resolves();
    sinon.stub(emailModule, "email").resolves();
    sinon.stub(tokenModule, "generateToken").resolves("123456");
  });

  afterEach(async () => {
    await transaction.rollback();
    sinon.restore();
  });

  describe("sendImpl Rate Limiting", () => {
    it("should rate limit by target identifier even with different IPs", async () => {
      const phone = "+8613800138000";
      const ip1 = "1.1.1.1";
      const ip2 = "2.2.2.2";

      // Send first token from IP1
      await sendImpl("phone", phone, ip1, transaction);

      // Attempt to send second token from IP2 to the SAME phone
      try {
        await sendImpl("phone", phone, ip2, transaction);
        expect.fail("Expected rate limit error");
      } catch (error: any) {
        void expect(error).to.be.instanceOf(TRPCError);
        void expect(error.message).to.include("验证码发送过于频繁");
      }
    });
  });

  describe("checkAndDeleteIdToken Brute Force Protection", () => {
    it("should increment failedAttempts on wrong token", async () => {
      const phone = "+8613800138000";
      const correctToken = "123456";
      const wrongToken = "000000";

      await db.IdToken.create({
        ip: "127.0.0.1",
        phone,
        token: correctToken,
        failedAttempts: 0
      }, { transaction });

      try {
        await checkAndDeleteIdToken("phone", phone, wrongToken, transaction);
        expect.fail("Expected error");
      } catch (error: any) {
        void expect(error.message).to.equal("手机验证码错误。");
      }

      const record = await db.IdToken.findOne({ where: { phone }, transaction });
      void expect(record?.failedAttempts).to.equal(1);
    });

    it("should delete token after 5 failed attempts", async () => {
      const phone = "+8613800138000";
      const correctToken = "123456";
      const wrongToken = "000000";

      await db.IdToken.create({
        ip: "127.0.0.1",
        phone,
        token: correctToken,
        failedAttempts: 4
      }, { transaction });

      try {
        await checkAndDeleteIdToken("phone", phone, wrongToken, transaction);
        expect.fail("Expected error");
      } catch (error: any) {
        void expect(error.message).to.include("验证码错误次数过多，已失效");
      }

      const record = await db.IdToken.findOne({ where: { phone }, transaction });
      void expect(record).to.be.null;
    });

    it("should reset failedAttempts when generating a new token", async () => {
      const phone = "+8613800138001";
      const ip = "127.0.0.1";

      // Create a record with failed attempts
      const record = await db.IdToken.create({
        ip,
        phone,
        token: "old-token",
        failedAttempts: 3
      }, { transaction });

      // Manually update updatedAt in the past to bypass rate limit
      await sequelize.query(
        `UPDATE "IdTokens" SET "updatedAt" = :updatedAt WHERE id = :id`,
        {
          replacements: {
            updatedAt: moment().subtract(1, "hour").toDate(),
            id: record.id
          },
          transaction
        }
      );

      // Generate new token
      await sendImpl("phone", phone, ip, transaction);

      const updatedRecord = await db.IdToken.findOne({ where: { phone }, transaction });
      void expect(updatedRecord?.token).to.equal("123456");
      void expect(updatedRecord?.failedAttempts).to.equal(0);
    });

    it("should not extend expiration by failed attempts (use createdAt)", async () => {
      const phone = "+8613800138002";
      const correctToken = "123456";
      const wrongToken = "000000";

      // Create a record that is almost expired
      const record = await db.IdToken.create({
        ip: "127.0.0.1",
        phone,
        token: correctToken,
        failedAttempts: 0,
        createdAt: moment().subtract(4, "minutes").toDate(),
        updatedAt: moment().subtract(4, "minutes").toDate()
      }, { transaction });

      // Failed attempt
      try {
        await checkAndDeleteIdToken("phone", phone, wrongToken, transaction);
      } catch (e) {}

      // Manually set createdAt to be old
      await sequelize.query(
        `UPDATE "IdTokens" SET "createdAt" = :createdAt, "updatedAt" = :updatedAt WHERE id = :id`,
        {
          replacements: {
            createdAt: moment().subtract(6, "minutes").toDate(),
            updatedAt: moment().toDate(),
            id: record.id
          },
          transaction
        }
      );

      try {
        await checkAndDeleteIdToken("phone", phone, correctToken, transaction);
        expect.fail("Expected expired error");
      } catch (error: any) {
        void expect(error.message).to.include("验证码已过期");
      }
    });
  });
});
