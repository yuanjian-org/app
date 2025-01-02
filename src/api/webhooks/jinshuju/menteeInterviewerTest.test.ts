import { expect } from 'chai';
import { submit } from '.';
import User from '../../database/models/User';
import { createUser } from "../../routes/users";
import sequelize from '../../database/sequelize';

const input = {
  "form": "w02l95",
  "form_name": "Foo",
  "entry": {
    "field_1": "测试员",
    "exam_score": 120,
  }
};

describe('submitMenteeInterviewerTestResult', () => {
  before(async () => {
    await sequelize.transaction(async transaction => {
      await createUser({
        name: "测试员",
        email: "test@email.com",
        roles: [],
      }, transaction);
      await createUser({
        name: "测试员",
        email: "test2@email.com",
        roles: [],
      }, transaction);
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
