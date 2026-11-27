import { expect } from "chai";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";
import {
  createDraftImpl,
  updateDraftImpl,
  reorderDraftImpl,
  destroyDraftImpl,
  getDraftImpl,
  listDraftsImpl,
  finalizeDraftImpl,
  listFinalizedBatchesImpl,
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

  describe("destroyDraftImpl", () => {
    it("should successfully delete a draft", async () => {
      await createDraftImpl(mentee.id, mentor1.id, "Reason 1", transaction);
      await createDraftImpl(mentee.id, mentor2.id, "Reason 2", transaction);

      await destroyDraftImpl(mentee.id, mentor1.id, transaction);

      const batch = await db.MentorSelectionBatch.findOne({
        where: { userId: mentee.id, finalizedAt: null },
        include: [{ association: "selections" }],
        transaction,
      });

      expect(batch?.selections.length).to.equal(1);
      expect(batch?.selections[0].mentorId).to.equal(mentor2.id);
    });

    it("should throw NOT_FOUND error when draft doesn't exist", async () => {
      try {
        await destroyDraftImpl(mentee.id, mentor1.id, transaction);
        expect.fail("Expected destroyDraftImpl to throw an error");
      } catch (err: any) {
        expect(err.code).to.equal("NOT_FOUND");
      }
    });
  });

  describe("getDraftImpl", () => {
    it("should fetch a specific mentor draft", async () => {
      await createDraftImpl(mentee.id, mentor1.id, "Reason 1", transaction);
      const draft = await getDraftImpl(mentee.id, mentor1.id, transaction);
      expect(draft?.mentorId).to.equal(mentor1.id);
      expect(draft?.reason).to.equal("Reason 1");
    });

    it("should return null if user hasn't selected this mentor", async () => {
      const draft = await getDraftImpl(mentee.id, mentor1.id, transaction);
      void expect(draft).to.be.null;
    });
  });

  describe("listDraftsImpl", () => {
    it("should fetch all mentor drafts of a user", async () => {
      await createDraftImpl(mentee.id, mentor1.id, "Reason 1", transaction);
      await createDraftImpl(mentee.id, mentor2.id, "Reason 2", transaction);

      const drafts = await listDraftsImpl(mentee.id, transaction);
      expect(drafts.length).to.equal(2);
      expect(drafts[0].mentorId).to.equal(mentor1.id);
      expect(drafts[1].mentorId).to.equal(mentor2.id);
    });

    it("should return empty array if there are no drafts", async () => {
      const drafts = await listDraftsImpl(mentee.id, transaction);
      expect(drafts.length).to.equal(0);
    });
  });

  describe("finalizeDraftImpl", () => {
    it("should finalize mentor selection drafts successfully", async () => {
      await createDraftImpl(mentee.id, mentor1.id, "Reason 1", transaction);

      await finalizeDraftImpl(mentee.id, transaction);

      const batch = await db.MentorSelectionBatch.findOne({
        where: { userId: mentee.id },
        transaction,
      });
      void expect(batch?.finalizedAt).to.not.be.null;
    });

    it("should throw generalBadRequestError if there are no drafts to finalize", async () => {
      try {
        await finalizeDraftImpl(mentee.id, transaction);
        expect.fail("Expected finalizeDraftImpl to throw an error");
      } catch (err: any) {
        expect(err.code).to.equal("BAD_REQUEST");
        expect(err.message).to.include("没有未完成的导师选择，请刷新页面重试");
      }
    });
  });

  describe("listFinalizedBatchesImpl", () => {
    it("should fetch finalized batches for a user", async () => {
      await createDraftImpl(mentee.id, mentor1.id, "Reason 1", transaction);
      await finalizeDraftImpl(mentee.id, transaction);

      const batches = await listFinalizedBatchesImpl(mentee.id, transaction);
      expect(batches.length).to.equal(1);
      void expect(batches[0].finalizedAt).to.not.be.null;
    });
  });

  describe("listLastBatchFinalizedAtImpl", () => {
    it("should fetch latest batch finalized timestamps for all users", async () => {
      await createDraftImpl(mentee.id, mentor1.id, "Reason 1", transaction);
      await finalizeDraftImpl(mentee.id, transaction);

      const mentee2 = await db.User.create(
        { email: "mentee2@example.com", name: "Test Mentee 2", roles: [] },
        { transaction },
      );
      await createDraftImpl(mentee2.id, mentor2.id, "Reason 2", transaction);

      const timestamps = await listLastBatchFinalizedAtImpl(transaction);

      const mentee1Timestamp = timestamps.find(
        (t: any) => t.userId === mentee.id,
      );
      const mentee2Timestamp = timestamps.find(
        (t: any) => t.userId === mentee2.id,
      );

      void expect(mentee1Timestamp?.finalizedAt).to.not.be.null;
      void expect(mentee2Timestamp?.finalizedAt).to.be.null;
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
