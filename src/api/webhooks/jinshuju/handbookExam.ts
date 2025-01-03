import { decodeXField } from "../../../shared/jinshuju";
import db from "../../database/db";
import moment from "moment";
import { generalBadRequestError, notFoundError } from "../../errors";
import sequelize from "../../database/sequelize";

// Webhook for https://jsj.top/f/wqPdKE, which is embedded in /exams/handbook
export default async function submit(entry: Record<string, any>) {
  const userId = decodeXField(entry);
  if (!userId) {
    throw generalBadRequestError(`Empty or malformed x_field_1`);
  }

  if (entry.exam_score < 100) {
    console.log(`HandbookExam not passed for ${userId}. Igored.`);
    return;
  }

  await sequelize.transaction(async transaction => {
    const u = await db.User.findByPk(userId, { 
      attributes: ["id", "state"],
      transaction,
    });
    if (!u) throw notFoundError("用户", userId);
    await u.update({
      state: {
        ...u.state,
        handbookExam: moment().toISOString(),
      },
    }, { transaction });
  });
}
