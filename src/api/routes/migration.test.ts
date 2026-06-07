import { expect } from "chai";
import sinon from "sinon";
import { migrateDatabase } from "./migration";
import sequelize from "../database/sequelize";
import meetingSequelize from "../database/meetingSequelize";

describe("migration router", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("migrateDatabase should sync database and call migration steps", async () => {
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
