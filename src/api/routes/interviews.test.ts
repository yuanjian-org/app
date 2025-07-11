import { expect } from "chai";
import db from "../database/db";
import { createInterview, updateInterview } from "./interviews";
import { findGroups } from "./groups";
import { createUser } from "./users";
import invariant from "tiny-invariant";
import sequelize from "../database/sequelize";

const intervieweeEmail = "test-interviewee@email.com";
const interviewer1Email = "test-interviewer1@email.com";
const interviewer2Email = "test-interviewer2@email.com";
const interviewer3Email = "test-interviewer3@email.com";

async function findUserId(email: string): Promise<string | null> {
  const us = await db.User.findAll({ where: { email } });
  return us.length > 0 ? us[0].id : null;
}

async function getUserId(email: string): Promise<string> {
  const id = await findUserId(email);
  invariant(id);
  return id;
}

async function createUserIfNotFound(email: string) {
  const id = await findUserId(email);
  if (!id) {
    await sequelize.transaction(async (transaction) => {
      await createUser({ email: email, name: "测试", roles: [] }, transaction);
    });
  }
}

describe("interviews", () => {
  before(async () => {
    await createUserIfNotFound(intervieweeEmail);
    await createUserIfNotFound(interviewer1Email);
    await createUserIfNotFound(interviewer2Email);
    await createUserIfNotFound(interviewer3Email);
  });

  after(async () => {
    const is = await db.Interview.findAll({
      where: { intervieweeId: await getUserId(intervieweeEmail) },
    });
    for (const i of is) {
      await i.destroy({ force: true });
    }

    // TODO: Remove users
  });

  it("`create` should create group", async () => {
    const interviewee = await getUserId(intervieweeEmail);
    const interviewers = [
      await getUserId(interviewer1Email),
      await getUserId(interviewer2Email),
    ];
    await sequelize.transaction(async (transaction) => {
      await createInterview(
        "MenteeInterview",
        null,
        interviewee,
        interviewers,
        transaction,
      );
    });
    const gs = await findGroups([interviewee, ...interviewers], "exclusive");
    expect(gs.length).is.equal(1);
  });

  it("`update` should update group", async () => {
    const interviewee = await getUserId(intervieweeEmail);
    const interviewers = [await getUserId(interviewer2Email)];
    const id = await sequelize.transaction(async (transaction) => {
      return await createInterview(
        "MenteeInterview",
        null,
        interviewee,
        interviewers,
        transaction,
      );
    });

    const newInterviewers = [
      await getUserId(interviewer1Email),
      await getUserId(interviewer3Email),
    ];
    await updateInterview(
      id,
      "MenteeInterview",
      null,
      interviewee,
      newInterviewers,
    );
    const gs = await findGroups([interviewee, ...newInterviewers], "exclusive");
    expect(gs.length).is.equal(1);
  });
});
