import { expect } from "chai";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";
import {
  createDraftImpl,
  updateDraftImpl,
  reorderDraftImpl,
  listLastBatchFinalizedAtImpl,
} from "./mentorSelections";

describe("mentorSelections routes", () => {
  let transaction: Transaction;
  let mentee: any;
  let mentor1: any;
  let mentor2: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    mentee = await db.User.create(
      {
        email: "mentee@example.com",
        name: "Test Mentee",
        roles: [],
      },
      { transaction },
    );

    mentor1 = await db.User.create(
      {
        email: "mentor1@example.com",
        name: "Test Mentor 1",
        roles: ["Mentor"],
      },
      { transaction },
    );

    mentor2 = await db.User.create(
      {
        email: "mentor2@example.com",
        name: "Test Mentor 2",
        roles: ["Mentor"],
      },
      { transaction },
    );
  });

  afterEach(async () => {
    if (transaction) await transaction.rollback();
  });

  describe("createDraftImpl", () => {
    it("should successfully create a draft batch and selection for a mentor", async () => {
      const reason = "They are experienced.";
      await createDraftImpl(mentee.id, mentor1.id, reason, transaction);

      const batch = await db.MentorSelectionBatch.findOne({
        where: { userId: mentee.id, finalizedAt: null },
        include: [{ association: "selections" }],
        transaction,
      });

      void expect(batch).to.not.be.null;
      expect(batch?.selections.length).to.equal(1);

      const selection = batch?.selections[0];
      expect(selection?.mentorId).to.equal(mentor1.id);
      expect(selection?.reason).to.equal(reason);
      expect(selection?.order).to.equal(0);
    });

    it("should append a new selection to an existing draft batch with correct order", async () => {
      await createDraftImpl(mentee.id, mentor1.id, "Reason 1", transaction);
      await createDraftImpl(mentee.id, mentor2.id, "Reason 2", transaction);

      const batch = await db.MentorSelectionBatch.findOne({
        where: { userId: mentee.id, finalizedAt: null },
        include: [{ association: "selections" }],
        transaction,
      });

      void expect(batch).to.not.be.null;
      expect(batch?.selections.length).to.equal(2);

      const selection1 = batch?.selections.find(
        (s: any) => s.mentorId === mentor1.id,
      );
      const selection2 = batch?.selections.find(
        (s: any) => s.mentorId === mentor2.id,
      );

      expect(selection1?.order).to.equal(0);
      expect(selection2?.order).to.equal(1);
    });
  });

  describe("updateDraftImpl", () => {
    it("should successfully update the reason for an existing draft selection", async () => {
      await createDraftImpl(
        mentee.id,
        mentor1.id,
        "Initial reason",
        transaction,
      );

      const newReason = "Updated reason";
      await updateDraftImpl(mentee.id, mentor1.id, newReason, transaction);

      const batch = await db.MentorSelectionBatch.findOne({
        where: { userId: mentee.id, finalizedAt: null },
        include: [{ association: "selections" }],
        transaction,
      });

      const selection = batch?.selections[0];
      expect(selection?.reason).to.equal(newReason);
    });

    it("should throw an error if the mentor selection does not exist", async () => {
      try {
        await updateDraftImpl(mentee.id, mentor1.id, "Reason", transaction);
        expect.fail("Expected updateDraftImpl to throw an error");
      } catch (err: any) {
        expect(err.message).to.include("Invariant failed");
      }
    });
  });

  describe("listLastBatchFinalizedAtImpl", () => {
    it("should return the latest finalizedAt if a user has no drafts", async () => {
      await db.MentorSelectionBatch.create(
        { userId: mentee.id, finalizedAt: new Date("2024-01-01T00:00:00Z") },
        { transaction },
      );
      await db.MentorSelectionBatch.create(
        { userId: mentee.id, finalizedAt: new Date("2024-02-01T00:00:00Z") },
        { transaction },
      );

      const result = await listLastBatchFinalizedAtImpl(transaction);
      const userResult = result.find((r) => r.userId === mentee.id);

      expect(userResult?.finalizedAt?.toISOString()).to.equal(
        "2024-02-01T00:00:00.000Z",
      );
    });

    it("should return null if a user has a draft (unfinalized batch)", async () => {
      await db.MentorSelectionBatch.create(
        { userId: mentee.id, finalizedAt: new Date("2024-01-01T00:00:00Z") },
        { transaction },
      );
      await db.MentorSelectionBatch.create(
        { userId: mentee.id, finalizedAt: null },
        { transaction },
      );

      const result = await listLastBatchFinalizedAtImpl(transaction);
      const userResult = result.find((r) => r.userId === mentee.id);

      void expect(userResult?.finalizedAt).to.be.null;
    });

    it("should handle multiple users correctly", async () => {
      const mentee2 = await db.User.create(
        {
          email: "mentee222@example.com",
          name: "Test Mentee 2",
          roles: [],
        },
        { transaction },
      );

      await db.MentorSelectionBatch.create(
        { userId: mentee.id, finalizedAt: new Date("2024-01-01T00:00:00Z") },
        { transaction },
      );
      await db.MentorSelectionBatch.create(
        { userId: mentee2.id, finalizedAt: new Date("2024-01-01T00:00:00Z") },
        { transaction },
      );
      await db.MentorSelectionBatch.create(
        { userId: mentee2.id, finalizedAt: null },
        { transaction },
      );

      const result = await listLastBatchFinalizedAtImpl(transaction);

      const r1 = result.find((r) => r.userId === mentee.id);
      expect(r1?.finalizedAt?.toISOString()).to.equal(
        "2024-01-01T00:00:00.000Z",
      );

      const r2 = result.find((r) => r.userId === mentee2.id);
      void expect(r2?.finalizedAt).to.be.null;
    });
  });

  describe("reorderDraftImpl", () => {
    it("should successfully reorder draft selections", async () => {
      await createDraftImpl(mentee.id, mentor1.id, "Reason 1", transaction);
      await createDraftImpl(mentee.id, mentor2.id, "Reason 2", transaction);

      // Current order: mentor1: 0, mentor2: 1
      // We want to reverse it.
      await reorderDraftImpl(
        mentee.id,
        [
          { mentorId: mentor2.id, order: 0 },
          { mentorId: mentor1.id, order: 1 },
        ],
        transaction,
      );

      const batch = await db.MentorSelectionBatch.findOne({
        where: { userId: mentee.id, finalizedAt: null },
        include: [{ association: "selections" }],
        transaction,
      });

      const selection1 = batch?.selections.find(
        (s: any) => s.mentorId === mentor1.id,
      );
      const selection2 = batch?.selections.find(
        (s: any) => s.mentorId === mentor2.id,
      );

      expect(selection1?.order).to.equal(1);
      expect(selection2?.order).to.equal(0);
    });

    it("should throw an error if the number of selections in input doesn't match the database", async () => {
      await createDraftImpl(mentee.id, mentor1.id, "Reason 1", transaction);

      try {
        await reorderDraftImpl(
          mentee.id,
          [
            { mentorId: mentor1.id, order: 1 },
            { mentorId: mentor2.id, order: 2 },
          ],
          transaction,
        );
        expect.fail("Expected reorderDraftImpl to throw an error");
      } catch (err: any) {
        expect(err.message).to.include("导师选择数量不匹配");
      }
    });
  });
});
