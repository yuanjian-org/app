import { expect } from "chai";
import sinon from "sinon";
import sequelize from "../database/sequelize";
import { migrateDatabase } from "./migration";

describe("migration", () => {
  let queryStub: sinon.SinonStub;
  let syncStub: sinon.SinonStub;

  beforeEach(() => {
    queryStub = sinon.stub(sequelize, "query").resolves();
    syncStub = sinon.stub(sequelize, "sync").resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should call migrateSchema and sequelize.sync during migrateDatabase", async () => {
    await migrateDatabase();

    expect(queryStub.calledOnce).to.be.true;
    expect(queryStub.firstCall.args[0]).to.include(
      "CREATE INDEX IF NOT EXISTS groups_archived",
    );

    expect(syncStub.calledOnce).to.be.true;
    expect(syncStub.firstCall.args[0]).to.deep.equal({
      alter: { drop: false },
    });
  });
});
