import { expect } from "chai";
import sinon from "sinon";
import sequelize from "../database/sequelize";
import meetingSequelize from "../database/meetingSequelize";
import { migrateDatabase } from "./migration";

describe("migration.ts", () => {
  let sequelizeSyncStub: sinon.SinonStub;
  let meetingSequelizeSyncStub: sinon.SinonStub;

  beforeEach(() => {
    sequelizeSyncStub = sinon.stub(sequelize, "sync").resolves();
    meetingSequelizeSyncStub = sinon.stub(meetingSequelize, "sync").resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("migrateDatabase", () => {
    it("should successfully sync sequelize and meetingSequelize with { alter: { drop: false } }", async () => {
      await migrateDatabase();

      void expect(sequelizeSyncStub.calledOnce).to.be.true;
      void expect(sequelizeSyncStub.calledWith({ alter: { drop: false } })).to
        .be.true;

      void expect(meetingSequelizeSyncStub.calledOnce).to.be.true;
      void expect(
        meetingSequelizeSyncStub.calledWith({ alter: { drop: false } }),
      ).to.be.true;
    });
  });
});
