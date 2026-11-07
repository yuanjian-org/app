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
    it("should migrate MentorBookings and sync dbs", async () => {
      // Simulate pre-migration state where topic and notes were VARCHAR(255).
      await sequelize.query(`
        ALTER TABLE "MentorBookings"
          ALTER COLUMN "topic" TYPE VARCHAR(255),
          ALTER COLUMN "notes" TYPE VARCHAR(255);
      `);

      await migrateDatabase();

      const [columns] = await sequelize.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'MentorBookings'
          AND column_name IN ('topic', 'notes');
      `);
      const typedColumns = columns as Array<{
        column_name: string;
        data_type: string;
      }>;
      expect(typedColumns).to.have.lengthOf(2);
      for (const col of typedColumns) {
        expect(col.data_type).to.equal("text");
      }

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
