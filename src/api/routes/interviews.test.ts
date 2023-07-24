import { expect } from 'chai';
import initApiServer from '../initApiServer';
import db from '../database/db';
import { createInterview, updateInterview } from './interviews';
import { findGroups } from './groups';
import { createUser } from '../database/models/User';
import invariant from "tiny-invariant";

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
  if (!id) await createUser({ email: email, roles: [] });
}

describe('interviews', () => {
  before(async () => {
    initApiServer();

    await createUserIfNotFound(intervieweeEmail);
    await createUserIfNotFound(interviewer1Email);
    await createUserIfNotFound(interviewer2Email);
    await createUserIfNotFound(interviewer3Email);
  });

  after(async () => {
    const is = await db.Interview.findAll({
      where: { intervieweeId: await getUserId(intervieweeEmail) }
    });
    for (const i of is) {
      await i.destroy({ force: true });
    }

    // TODO: Remove users
  })

  it('`create` should create group', async () => {
    const interviewee = await getUserId(intervieweeEmail);
    const interviewers = [await getUserId(interviewer1Email), await getUserId(interviewer2Email)];
    await createInterview("MenteeInterview", interviewee, interviewers);
    const gs = await findGroups([interviewee, ...interviewers], "exclusive");
    expect(gs.length).is.equal(1);
  });

  it('`update` should update group', async () => {
    const interviewee = await getUserId(intervieweeEmail);
    const interviewers = [await getUserId(interviewer2Email)];
    const id = await createInterview("MenteeInterview", interviewee, interviewers);

    const newInterviewers = [await getUserId(interviewer1Email), await getUserId(interviewer3Email)];
    await updateInterview(id, "MenteeInterview", interviewee, newInterviewers);
    const gs = await findGroups([interviewee, ...newInterviewers], "exclusive");
    expect(gs.length).is.equal(1);
  });
});
