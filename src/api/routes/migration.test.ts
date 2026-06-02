import { expect } from "chai";
import sinon from "sinon";
import { TRPCError } from "@trpc/server";
import sequelize from "../database/sequelize";
import meetingSequelize from "../database/meetingSequelize";
import migrationRouter, { migrateDatabase } from "./migration";

describe("migration", () => {
  let envBackup: NodeJS.ProcessEnv;

  beforeEach(() => {
    envBackup = { ...process.env };
    process.env.INTEGRATION_AUTH_TOKEN = "integration_test_token";
  });

  afterEach(() => {
    process.env = envBackup;
    sinon.restore();
  });

  describe("migrateDatabase route", () => {
    it("should throw BAD_REQUEST if token is invalid", async () => {
      const caller = migrationRouter.createCaller({
        req: { headers: { authorization: "Bearer invalid_token" } },
      } as any);

      let error: any;
      try {
        await caller.migrateDatabase();
      } catch (e) {
        error = e;
      }

      expect(error !== undefined).to.equal(true);
      expect(error).to.be.instanceOf(TRPCError);
      expect(error.code).to.equal("BAD_REQUEST");
    });
  });

  describe("migrateDatabase function", () => {
    it("should synchronize both databases without dropping tables", async () => {
      const sequelizeSyncStub = sinon.stub(sequelize, "sync").resolves();
      const meetingSequelizeSyncStub = sinon
        .stub(meetingSequelize, "sync")
        .resolves();

      await migrateDatabase();

      void expect(sequelizeSyncStub.calledOnce).to.be.true;
      expect(sequelizeSyncStub.firstCall.args[0]).to.deep.equal({
        alter: { drop: false },
      });

      void expect(meetingSequelizeSyncStub.calledOnce).to.be.true;
      expect(meetingSequelizeSyncStub.firstCall.args[0]).to.deep.equal({
        alter: { drop: false },
      });
    });
  });
});
