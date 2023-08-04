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
  });

  after(async () => {
    const u = await User.findOne({ where: { name: "测试员" } });
    if (u) await u.destroy({ force: true });
  });

  it('should submit passing score', async () => {
    await submit(input);
    const u = await User.findOne({ where: { name: "测试员" } });
    expect(u).is.not.null;
    expect(u?.menteeInterviewerTestLastPassedAt).is.not.null;
  });
});
