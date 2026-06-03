import crypto from "crypto";
import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { hasSummary, saveSummaryIfNotExistImpl } from "./saveSummary";

describe("saveSummary", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  describe("hasSummary", () => {
    it("should return false if summary does not exist", async () => {
      const result = await hasSummary(
        "nonexistent-transcript",
        "some-key",
        transaction,
      );
      expect(result).to.equal(false);
    });

    it("should return true if summary exists", async () => {
      const groupId = crypto.randomUUID();
      await db.Group.create(
        { id: groupId, name: "Test Group", cycleId: 1, whiteLabel: "test" },
        { transaction },
      );

      const transcriptId = crypto.randomUUID();
      await db.Transcript.create(
        {
          id: transcriptId,
          groupId,
          startedAt: Date.now() - 1000,
          endedAt: Date.now(),
        },
        { transaction },
      );

      await db.Summary.create(
        {
          transcriptId,
          key: "test-key",
          markdown: "some markdown",
          initialLength: 13,
          deletedLength: 0,
        },
        { transaction },
      );

      const result = await hasSummary(transcriptId, "test-key", transaction);
      expect(result).to.equal(true);
    });
  });

  describe("saveSummaryIfNotExistImpl", () => {
    it("should create a transcript and summary if they don't exist", async () => {
      const groupId = crypto.randomUUID();
      await db.Group.create(
        { id: groupId, name: "Test Group", cycleId: 1, whiteLabel: "test" },
        { transaction },
      );

      const transcriptId = crypto.randomUUID();

      await saveSummaryIfNotExistImpl(
        transcriptId,
        groupId,
        1000,
        2000,
        "test-key",
        "hello world",
        transaction,
      );

      const transcript = await db.Transcript.findByPk(transcriptId, {
        transaction,
      });
      expect(transcript).to.not.equal(null);
      expect(transcript?.groupId).to.equal(groupId);
      expect(
        new Date(transcript?.startedAt as string | number | Date).getTime(),
      ).to.equal(1000);
      expect(
        new Date(transcript?.endedAt as string | number | Date).getTime(),
      ).to.equal(2000);

      const summary = await db.Summary.findOne({
        where: { transcriptId, key: "test-key" },
        transaction,
      });
      expect(summary).to.not.equal(null);
      expect(summary?.markdown).to.equal("hello world");
      expect(summary?.initialLength).to.equal("hello world".length);
    });

    it("should not create a summary if one already exists", async () => {
      const groupId = crypto.randomUUID();
      await db.Group.create(
        { id: groupId, name: "Test Group", cycleId: 1, whiteLabel: "test" },
        { transaction },
      );

      const transcriptId = crypto.randomUUID();
      await db.Transcript.create(
        {
          id: transcriptId,
          groupId,
          startedAt: 1000,
          endedAt: 2000,
        },
        { transaction },
      );

      await db.Summary.create(
        {
          transcriptId,
          key: "test-key",
          markdown: "existing markdown",
          initialLength: "existing markdown".length,
          deletedLength: 0,
        },
        { transaction },
      );

      await saveSummaryIfNotExistImpl(
        transcriptId,
        groupId,
        1000,
        2000,
        "test-key",
        "new markdown",
        transaction,
      );

      const summary = await db.Summary.findOne({
        where: { transcriptId, key: "test-key" },
        transaction,
      });
      expect(summary).to.not.equal(null);
      expect(summary?.markdown).to.equal("existing markdown"); // Should not be updated to 'new markdown'
    });
  });
});
