import { expect } from 'chai';
import User from './User';
import GroupUser from './GroupUser';
import Mentorship from './Mentorship';
import Group from './Group';
import { Op } from 'sequelize';

describe('User', () => {
  describe('cascadeDestory', () => {
    let user1: User;
    let user2: User;
    let group: Group;

    it('should finish all tests on users', async () => {

      user1 = await User.create({
        name: '测试用户一',
        pinyin: 'ceshiyonghuyi',
        email: 'testuser1@example.foo',
        roles: ['Mentor'],
        sex: '男',
        wechat: 'testWechat1',
        city: 'city1',
      });

      // 查找 name 为 '测试用户一' 的用户
      const foundUser1 = await User.findOne({ where: { name: '测试用户一' } });

      // 确认找到的用户存在
      expect(foundUser1).to.exist;

      user2 = await User.create({
        name: '测试用户二',
        pinyin: 'ceshiyonghuer',
        email: 'testuser2@example.foo',
        roles: ['Mentee'],
        sex: '男',
        wechat: 'testWechat2',
        city: 'city2',
      });
      // 查找 name 为 '测试用户二' 的用户
      const foundUser2 = await User.findOne({ where: { name: '测试用户二' } });

      // 确认找到的用户存在
      expect(foundUser2).to.exist;

      // 建立组
      group = await Group.create({ name: 'testgroup', roles: ['Mentor', 'Mentee'] });
      await group.$add('users', [user1, user2]);
      await group.reload();

      const foundGroup = await Group.findOne({
        where: { name: 'testgroup' },
        include: { model: User }
      });

      // 确认新的组内用户数量为2
      expect(foundGroup).to.exist;
      if (foundGroup) {
        const userIds = foundGroup.users.map(user => user.id);
        expect(userIds).to.include.members([user1.id, user2.id]);
      };

      // 建立搭档关系
      await Mentorship.create({
        mentorId: user1.id,
        menteeId: user2.id
      });

      // 查找新创建的 mentorship
      const foundMentorship = await Mentorship.findOne({
        where: {
          mentorId: user1.id,
          menteeId: user2.id
        }
      });

      // 确认找到的 mentorship 存在
      expect(foundMentorship).to.exist;


      //删除user1，检查相关partner是否被删除
      await user1.destroy();
      const findUser1 = await User.findByPk(user1.id, { paranoid: false });
      if (findUser1) {
        expect(findUser1.deletedAt).to.not.be.null;
      } else {
        throw new Error("findUser1 is null.");
      }

      const findMentorship = await Mentorship.findOne({
        where: {
          mentorId: user1.id,
          menteeId: user2.id
        },
        paranoid: false
      });
      if (findMentorship) {
        expect(findMentorship.deletedAt).to.not.be.null;
      } else {
        throw new Error("findMentorship is null.");
      }

      //删除user2，检查相关groupUser是否被删除
      await user2.destroy();

      const findUser2 = await User.findByPk(user2.id, { paranoid: false });
      if (findUser2) {
        expect(findUser2.deletedAt).to.not.be.null;
      } else {
        throw new Error("findUser2 is null.");
      }

      const findUser2inGroup = await GroupUser.findAll({
        where: { userId: user2.id },
        paranoid: false
      });
      for (const gu of findUser2inGroup) {
        expect(gu.deletedAt).to.not.be.null;
      }

    // 使用force彻底清理测试用例

      await Mentorship.destroy({
        where: {
          [Op.or]: [
            { mentorId: user1.id },
            { menteeId: user1.id },
            { mentorId: user2.id },
            { menteeId: user2.id }
          ]
        },
        force: true
      });

      await User.destroy({ where: { name: '测试用户一' }, force: true });
      await User.destroy({ where: { name: '测试用户二' }, force: true });
      await Group.destroy({ where: { name: 'testgroup' }, force: true });

      const foundUser1End = await User.findOne({ where: { name: '测试用户一' } });
      expect(foundUser1End).to.be.null;
      const foundUser2End = await User.findOne({ where: { name: '测试用户二' } });
      expect(foundUser2End).to.be.null;
      const foundGroupEnd = await Group.findOne({ where: { name: 'testgroup' } });
      expect(foundGroupEnd).to.be.null;
    });
  });
});
