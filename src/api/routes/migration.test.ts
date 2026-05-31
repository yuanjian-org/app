import { expect } from "chai";
import sinon from "sinon";
import { migrateDatabase } from "./migration";
import sequelize from "../database/sequelize";
import meetingSequelize from "../database/meetingSequelize";

describe("migration", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should sync schemas for both sequelize instances", async () => {
    const sequelizeSyncStub = sinon.stub(sequelize, "sync").resolves();
    const meetingSequelizeSyncStub = sinon.stub(meetingSequelize, "sync").resolves();

    await migrateDatabase();

    expect(sequelizeSyncStub.calledOnce).to.be.true;
    expect(sequelizeSyncStub.calledWith({ alter: { drop: false } })).to.be.true;
    expect(meetingSequelizeSyncStub.calledOnce).to.be.true;
    expect(meetingSequelizeSyncStub.calledWith({ alter: { drop: false } })).to.be.true;
  });
});
