import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { purgeOldData } from "./purgeOldData";

describe("purgeOldData", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  it("should purge old EventLog, InterviewFeedbackUpdateAttempt, and MeetingHistory records", async () => {
    const now = Date.now();
    const oneDay = 86400000;

    const oldEventLogDate = new Date(now - 366 * oneDay); // Older than 365 days
    const newEventLogDate = new Date(now - 10 * oneDay);

    const oldInterviewAttemptDate = new Date(now - 31 * oneDay); // Older than 30 days
    const newInterviewAttemptDate = new Date(now - 10 * oneDay);

    const oldMeetingHistoryDate = new Date(now - 61 * oneDay); // Older than 60 days
    const newMeetingHistoryDate = new Date(now - 10 * oneDay);

    // Create EventLog records
    await db.EventLog.create(
      {
        userId: null,
        data: {
          type: "MeetingCreation",
          tmUserId: "test1",
          meetingId: "test1",
          meetingLink: "https://test.com",
        },
      },
      { transaction },
    );
    const oldEventLog = await db.EventLog.findOne({
      transaction,
      order: [["id", "DESC"]],
    });
    await sequelize.query(
      `UPDATE "EventLogs" SET "updatedAt" = ? WHERE id = ?`,
      {
        replacements: [oldEventLogDate, oldEventLog!.id],
        transaction,
      },
    );

    await db.EventLog.create(
      {
        userId: null,
        data: {
          type: "MeetingCreation",
          tmUserId: "test2",
          meetingId: "test2",
          meetingLink: "https://test.com",
        },
      },
      { transaction },
    );
    const newEventLog = await db.EventLog.findOne({
      transaction,
      order: [["id", "DESC"]],
    });
    await sequelize.query(
      `UPDATE "EventLogs" SET "updatedAt" = ? WHERE id = ?`,
      {
        replacements: [newEventLogDate, newEventLog!.id],
        transaction,
      },
    );

    // Create InterviewFeedbackUpdateAttempt records
    await db.InterviewFeedbackUpdateAttempt.create(
      {
        intervieweeId: `test-interviewee-old-${Date.now()}`,
        interviewType: "MenteeInterview",
      },
      { transaction },
    );
    const oldAttempt = await db.InterviewFeedbackUpdateAttempt.findOne({
      transaction,
      order: [["id", "DESC"]],
    });
    await sequelize.query(
      `UPDATE "InterviewFeedbackUpdateAttempts" SET "updatedAt" = ? WHERE id = ?`,
      {
        replacements: [oldInterviewAttemptDate, oldAttempt!.id],
        transaction,
      },
    );

    await db.InterviewFeedbackUpdateAttempt.create(
      {
        intervieweeId: `test-interviewee-new-${Date.now()}`,
        interviewType: "MenteeInterview",
      },
      { transaction },
    );
    const newAttempt = await db.InterviewFeedbackUpdateAttempt.findOne({
      transaction,
      order: [["id", "DESC"]],
    });
    await sequelize.query(
      `UPDATE "InterviewFeedbackUpdateAttempts" SET "updatedAt" = ? WHERE id = ?`,
      {
        replacements: [newInterviewAttemptDate, newAttempt!.id],
        transaction,
      },
    );

    // Create MeetingHistory records
    const testGroup = await db.Group.create(
      { name: "Test Group", public: true },
      { transaction },
    );

    await db.MeetingHistory.create(
      {
        meetingId: `test-meeting-old-${Date.now()}`,
        groupId: testGroup.id,
        subject: "test",
        state: 1,
        startTime: new Date(),
        endTime: new Date(),
      },
      { transaction },
    );
    const oldMeeting = await db.MeetingHistory.findOne({
      transaction,
      order: [["id", "DESC"]],
    });
    await sequelize.query(
      `UPDATE "MeetingHistories" SET "updatedAt" = ? WHERE id = ?`,
      {
        replacements: [oldMeetingHistoryDate, oldMeeting!.id],
        transaction,
      },
    );

    await db.MeetingHistory.create(
      {
        meetingId: `test-meeting-new-${Date.now()}`,
        groupId: testGroup.id,
        subject: "test",
        state: 1,
        startTime: new Date(),
        endTime: new Date(),
      },
      { transaction },
    );
    const newMeeting = await db.MeetingHistory.findOne({
      transaction,
      order: [["id", "DESC"]],
    });
    await sequelize.query(
      `UPDATE "MeetingHistories" SET "updatedAt" = ? WHERE id = ?`,
      {
        replacements: [newMeetingHistoryDate, newMeeting!.id],
        transaction,
      },
    );

    // Call purgeOldData
    await purgeOldData(transaction);

    // Verify EventLogs
    const eventLogs = await db.EventLog.findAll({
      where: { id: [oldEventLog!.id, newEventLog!.id] },
      transaction,
    });
    expect(eventLogs.length).to.equal(1);
    expect(eventLogs[0].id).to.equal(newEventLog!.id);

    // Verify InterviewFeedbackUpdateAttempts
    const attempts = await db.InterviewFeedbackUpdateAttempt.findAll({
      where: { id: [oldAttempt!.id, newAttempt!.id] },
      transaction,
    });
    expect(attempts.length).to.equal(1);
    expect(attempts[0].id).to.equal(newAttempt!.id);

    // Verify MeetingHistories
    const meetings = await db.MeetingHistory.findAll({
      where: { id: [oldMeeting!.id, newMeeting!.id] },
      transaction,
    });
    expect(meetings.length).to.equal(1);
    expect(meetings[0].id).to.equal(newMeeting!.id);
  });
});
