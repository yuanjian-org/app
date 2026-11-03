import { expect } from "chai";
import sinon from "sinon";
import sequelize from "../database/sequelize";
import meetingSequelize from "../database/meetingSequelize";
import db from "../database/db";
import { migrateDatabase } from "./migration";

describe("migration.ts", () => {
  let sequelizeSyncStub: sinon.SinonStub;
  let meetingSequelizeSyncStub: sinon.SinonStub;

  beforeEach(() => {
    sequelizeSyncStub = sinon.stub(sequelize, "sync").resolves();
    meetingSequelizeSyncStub = sinon.stub(meetingSequelize, "sync").resolves();
    sinon.stub(sequelize, "query").resolves([[]] as any);
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

    it("should recalculate responseCount for existing ShudongPosts during migration", async () => {
      (sequelize.query as sinon.SinonStub).resolves([
        [{ table_name: "ShudongPosts" }, { table_name: "users" }],
      ] as any);

      const mockPosts = [
        { id: "q1", parentId: null, deletedAt: null, responseCount: 1 },
        { id: "r1", parentId: "q1", deletedAt: null, responseCount: 1 },
        { id: "r1_1", parentId: "r1", deletedAt: null, responseCount: 0 },
      ];

      sinon.stub(db.ShudongPost, "findAll").resolves(mockPosts as any);
      const updateStub = sinon
        .stub(db.ShudongPost, "update")
        .resolves([1] as any);

      await migrateDatabase();

      // q1 responseCount should be recalculated to 2 (r1 + r1_1)
      void expect(
        updateStub.calledWith({ responseCount: 2 }, { where: { id: "q1" } }),
      ).to.be.true;
    });
  });
});
