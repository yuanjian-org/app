import { expect } from 'chai';
import { submit } from './submitMenteeInterviewerTestResult';
import initApiServer from '../initApiServer';
import User, { createUser } from '../database/models/User';

const input = {
  "form": "w02l95",
  "form_name": "远见招生面试流程及标准测试",
  "entry": {
    "field_1": "测试员",
    "exam_score": 120,
  }
};

describe('submitMenteeInterviewerTestResult', () => {
  before(async () => {
    initApiServer();
    await createUser({
      name: "测试员",
      email: "test@email.com",
      roles: [],
    });
    await createUser({
      name: "测试员",
      email: "test2@email.com",
      roles: [],
    });
  });

  after(async () => {
    for (const u of await User.findAll({ where: { name: "测试员" } })) {
      await u.destroy({ force: true });
    }
  });

  it('should submit passing score for all users of same name', async () => {
    await submit(input);
    for (const u of await User.findAll({ where: { name: "测试员" } })) {
      expect(u.menteeInterviewerTestLastPassedAt).is.not.null;
    }
  });
});
