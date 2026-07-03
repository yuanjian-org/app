import { expect } from "chai";
import { TRPCError } from "@trpc/server";
import { Transaction } from "sequelize";
import sequelize from "../database/sequelize";
import cronRouter from "./cron";
import sinon from "sinon";
import * as whiteLabelModule from "shared/WhiteLabel";

import * as meetingsModule from "./meetings";
import * as scheduledNotificationsModule from "./scheduledNotifications";
import * as tasksModule from "./tasks";
import * as mentorshipsModule from "./mentorships";
import * as purgeOldDataModule from "./purgeOldData";
import * as migrationModule from "./migration";
import * as generateDemoDataModule from "./generateDemoData";

describe("cron", () => {
  let envBackup: NodeJS.ProcessEnv;
  let transaction: Transaction;
  let caller: ReturnType<typeof cronRouter.createCaller>;

  beforeEach(async () => {
    envBackup = { ...process.env };
    transaction = await sequelize.transaction();
    process.env.INTEGRATION_AUTH_TOKEN = "integration_test_token";

    caller = cronRouter.createCaller({
      req: {
        headers: {
          authorization: "Bearer " + process.env.INTEGRATION_AUTH_TOKEN,
        },
      },
    } as any);

    // Mock functions
    sinon.stub(meetingsModule, "syncMeetings").resolves();
    sinon.stub(meetingsModule, "recycleMeetings").resolves();
    sinon
      .stub(scheduledNotificationsModule, "sendScheduledNotifications")
      .resolves();
    sinon.stub(tasksModule, "createAutoTasks").resolves();
    sinon.stub(mentorshipsModule, "auditLastMentorshipMeetings").resolves();
    sinon.stub(purgeOldDataModule, "purgeOldData").resolves();
    sinon.stub(migrationModule, "migrateDatabase").resolves();
    sinon.stub(generateDemoDataModule, "generateDemoData").resolves();

    // Stub sequelize.drop to avoid actually dropping DB in tests
    sinon.stub(sequelize, "drop").resolves();
  });

  afterEach(async () => {
    sinon.restore();
    await transaction.rollback();
    process.env = envBackup;
  });

  describe("authIntegration", () => {
    it("should throw BAD_REQUEST if token is invalid for cron routes", async () => {
      const invalidCaller = cronRouter.createCaller({
        req: { headers: { authorization: "Bearer invalid_token" } },
      } as any);

      let error: any;
      try {
        await invalidCaller.syncMeetings();
      } catch (e) {
        error = e;
      }

      void expect(error !== undefined).to.equal(true);
      void expect(error).to.be.instanceOf(TRPCError);
      void expect(error.code).to.equal("BAD_REQUEST");
    });
  });

  describe("endpoints", () => {
    it("should call syncMeetings successfully", async () => {
      await caller.syncMeetings();
      void expect((meetingsModule.syncMeetings as sinon.SinonStub).called).to.be
        .true;
    });

    it("should call sendScheduledNotifications successfully", async () => {
      await caller.sendScheduledNotifications();
      void expect(
        (
          scheduledNotificationsModule.sendScheduledNotifications as sinon.SinonStub
        ).called,
      ).to.be.true;
    });

    it("should call createAutoTasks successfully", async () => {
      await caller.createAutoTasks();
      void expect((tasksModule.createAutoTasks as sinon.SinonStub).called).to.be
        .true;
    });

    it("should call auditLastMentorshipMeetings successfully", async () => {
      await caller.auditLastMentorshipMeetings();
      void expect(
        (mentorshipsModule.auditLastMentorshipMeetings as sinon.SinonStub)
          .called,
      ).to.be.true;
    });

    it("should call recycleMeetings successfully", async () => {
      await caller.recycleMeetings();
      void expect((meetingsModule.recycleMeetings as sinon.SinonStub).called).to
        .be.true;
    });

    it("should call purgeOldData successfully", async () => {
      await caller.purgeOldData();
      void expect((purgeOldDataModule.purgeOldData as sinon.SinonStub).called)
        .to.be.true;
    });
  });

  describe("resetDemoData", () => {
    let whiteLabelStub: sinon.SinonStub;

    beforeEach(() => {
      // Stub the whiteLabel constant using sinon
      whiteLabelStub = sinon
        .stub(whiteLabelModule, "whiteLabel")
        .value("yuantu");
    });

    afterEach(() => {
      whiteLabelStub.restore();
    });

    it("should throw if isDemo is false", async () => {
      whiteLabelStub.value("yuantu");

      const demoCaller = cronRouter.createCaller({
        req: {
          headers: {
            authorization: "Bearer " + process.env.INTEGRATION_AUTH_TOKEN,
          },
        },
      } as any);

      let error: any;
      try {
        await demoCaller.resetDemoData();
      } catch (e) {
        error = e;
      }

      void expect(error !== undefined).to.equal(true);
      void expect(error).to.be.instanceOf(TRPCError);
      void expect(error.code).to.equal("FORBIDDEN");
      void expect(error.message).to.include("数据");
    });

    it("should successfully execute if isDemo is true", async () => {
      whiteLabelStub.value("demo");

      const demoCaller = cronRouter.createCaller({
        req: {
          headers: {
            authorization: "Bearer " + process.env.INTEGRATION_AUTH_TOKEN,
          },
        },
      } as any);

      await demoCaller.resetDemoData();

      void expect((sequelize.drop as sinon.SinonStub).calledOnce).to.be.true;
      void expect(
        (migrationModule.migrateDatabase as sinon.SinonStub).calledOnce,
      ).to.be.true;
      void expect(
        (generateDemoDataModule.generateDemoData as sinon.SinonStub).calledOnce,
      ).to.be.true;
    });
  });
});
