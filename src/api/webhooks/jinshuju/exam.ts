import { whiteLabel } from "shared/WhiteLabel";
import { validateAndDecodeXField } from "../../jinshuju";
import db from "../../database/db";
import moment from "moment";
import { notFoundError } from "../../errors";
import { UserState } from "shared/UserState";
import { AutoTaskId } from "shared/Task";
import { Transaction } from "sequelize";

export default async function submit(
  formEntry: Record<string, any>,
  exam: keyof UserState,
  passingScore: number,
  transaction: Transaction,
) {
  const [userId] = validateAndDecodeXField(whiteLabel, formEntry);

  const score = formEntry.exam_score;
  if (score < passingScore) {
    console.log(`Exam not passed for ${userId}: ${score} < ${passingScore}.`);
    return;
  }

  const u = await db.User.findByPk(userId, {
    attributes: ["id", "state"],
    transaction,
  });
  if (!u) throw notFoundError("用户", userId);

  // Update user state
  await u.update(
    {
      state: {
        ...u.state,
        [exam]: moment().toISOString(),
      },
    },
    { transaction },
  );

  // Update task state
  if (exam === "commsExam" || exam === "handbookExam") {
    // Force type check
    const autoTaskId: AutoTaskId =
      exam === "commsExam" ? "study-comms" : "study-handbook";
    await db.Task.update(
      {
        done: true,
      },
      { where: { assigneeId: userId, autoTaskId }, transaction },
    );
  }
}
