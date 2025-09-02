import { expect } from "chai";
import { getCalibrationAndCheckPermissionSafe } from "./calibrations";
import db from "../database/db";
import sequelize from "../database/sequelize";

describe("getCalibrationAndCheckPermissionSafe", () => {
  let participant: any;
  let nonParticipant: any;
  let calibrationId: string;
  let inactiveCalibrationId: string;
  let interviewId: string;

  before(async () => {
    // Create test users
    await sequelize.transaction(async (transaction) => {
      // Create participant (interviewer)
      participant = await db.User.create(
        {
          email: "participant@test.com",
          name: "Test Participant",
        },
        { transaction },
      );

      // Create non-participant
      nonParticipant = await db.User.create(
        {
          email: "nonparticipant@test.com",
          name: "Test Non-Participant",
        },
        { transaction },
      );

      // Create active calibration
      const activeCalibration = await db.Calibration.create(
        {
          type: "MenteeInterview",
          name: "Test Active Calibration",
          active: true,
        },
        { transaction },
      );
      calibrationId = activeCalibration.id;

      // Create inactive calibration
      const inactiveCalibration = await db.Calibration.create(
        {
          type: "MenteeInterview",
          name: "Test Inactive Calibration",
          active: false,
        },
        { transaction },
      );
      inactiveCalibrationId = inactiveCalibration.id;

      // Create an interview in the active calibration with the participant
      const interview = await db.Interview.create(
        {
          type: "MenteeInterview",
          calibrationId: calibrationId,
          intervieweeId: nonParticipant.id,
        },
        { transaction },
      );
      interviewId = interview.id;

      // Create interview feedback to link participant as interviewer
      await db.InterviewFeedback.create(
        {
          interviewId: interviewId,
          interviewerId: participant.id,
        },
        { transaction },
      );
    });
  });

  after(async () => {
    // Clean up test data
    await sequelize.transaction(async (transaction) => {
      // Delete interview feedbacks if interviewId exists
      if (interviewId) {
        await db.InterviewFeedback.destroy({
          where: { interviewId },
          transaction,
        });

        // Delete interviews
        await db.Interview.destroy({
          where: { id: interviewId },
          transaction,
        });
      }

      // Delete calibrations
      if (calibrationId && inactiveCalibrationId) {
        await db.Calibration.destroy({
          where: { id: [calibrationId, inactiveCalibrationId] },
          transaction,
        });
      }

      // Delete test users
      await db.User.destroy({
        where: { id: [participant.id, nonParticipant.id] },
        transaction,
      });
    });
  });

  it("should allow participants access to active calibrations they are part of", async () => {
    await sequelize.transaction(async (transaction) => {
      const calibration = await getCalibrationAndCheckPermissionSafe(
        participant,
        calibrationId,
        transaction,
      );
      void expect(calibration).to.not.be.null;
      void expect(calibration?.id).to.equal(calibrationId);
      void expect(calibration?.active).to.be.true;
    });
  });

  it("should disallow participants access to inactive calibrations", async () => {
    await sequelize.transaction(async (transaction) => {
      const calibration = await getCalibrationAndCheckPermissionSafe(
        participant,
        inactiveCalibrationId,
        transaction,
      );
      void expect(calibration).to.be.null;
    });
  });

  it("should disallow non-participants access to calibrations", async () => {
    await sequelize.transaction(async (transaction) => {
      // Test access to active calibration
      const activeCalibration = await getCalibrationAndCheckPermissionSafe(
        nonParticipant,
        calibrationId,
        transaction,
      );
      void expect(activeCalibration).to.be.null;

      // Test access to inactive calibration
      const inactiveCalibration = await getCalibrationAndCheckPermissionSafe(
        nonParticipant,
        inactiveCalibrationId,
        transaction,
      );
      void expect(inactiveCalibration).to.be.null;
    });
  });
});
