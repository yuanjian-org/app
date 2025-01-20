import { decodeXField } from "../../../shared/jinshuju";
import db from "../../database/db";
import moment from "moment";
import { generalBadRequestError, notFoundError } from "../../errors";
import sequelize from "../../database/sequelize";
import { UserState } from "shared/UserState";
import { AutoTaskId } from "shared/Task";

export default async function submit(
  formEntry: Record<string, any>,
  exam: keyof UserState,
  passingScore: number,
) {
  const userId = decodeXField(formEntry);
  if (!userId) {
    throw generalBadRequestError(`Empty or malformed x_field_1`);
  }

  const score = formEntry.exam_score;
  if (score < passingScore) {
    console.log(`Exam not passed for ${userId}: ${score} < ${passingScore}.`);
    return;
  }

  await sequelize.transaction(async transaction => {
    const u = await db.User.findByPk(userId, { 
      attributes: ["id", "state"],
      transaction,
    });
    if (!u) throw notFoundError("用户", userId);

    // Update user state
    await u.update({
      state: {
        ...u.state,
        [exam]: moment().toISOString(),
      },
    }, { transaction });

    // Update task state
    if (exam === "commsExam" || exam === "handbookExam") {
      // Force type check
      const autoTaskId: AutoTaskId = exam === "commsExam" ?
        "study-comms" : "study-handbook";
      await db.Task.update({
        done: true,
      }, { where: { userId, autoTaskId }, transaction });
    }
  });
}
