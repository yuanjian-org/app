import { expect } from 'chai';
import User from './User';
import GroupUser from './GroupUser';
import Partnership from './Partnership';
import Group from './Group';
import initApiServer from '../../initApiServer';
import sequelizeInstance from '../sequelizeInstance';
import { Op } from 'sequelize';

describe('User', () => {
  before(async () => {
    await initApiServer();
  });

  describe('Database Connection', () => {
    it('should connect to the database successfully', async () => {
      try {
        await sequelizeInstance.authenticate();
        console.log('Connection has been established successfully.');
      } catch (error) {
        console.error('Unable to connect to the database:', error);
        throw error;
      }
    });
  });

  describe('cascadeDestory', () => {
    let user1: User;
    let user2: User;
    let group: Group;
    let partnership: Partnership;

    it('should create test users', async () => {

      user1 = await User.create({
        name: '测试用户一',
        pinyin: 'ceshiyonghuyi',
        email: 'testuser1@example.foo',
        roles: ['Mentor'],
        sex: 'male',
        wechat: 'testWechat1'
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
        sex: 'male',
        wechat: 'testWechat2'
      });
      // 查找 name 为 '测试用户二' 的用户
      const foundUser2 = await User.findOne({ where: { name: '测试用户二' } });

      // 确认找到的用户存在
      expect(foundUser2).to.exist;
    });

    // 建立组
    it('should create a group related to the users', async () => {
      group = await Group.create({ name: 'testgroup' });
      await group.$add('users', [user1, user2]);
      await group.reload();

      const foundGroup = await Group.findOne({
        where: { name: 'testgroup' },
        include: { model : User }
      });

      // 确认新的组内用户数量为2
      expect(foundGroup).to.exist;
      if (foundGroup) {
        const userIds = foundGroup.users.map(user => user.id);
        expect(userIds).to.include.members([user1.id, user2.id]);
      };

    });

    // 建立搭档关系
    it('should create a partnership between test users', async () => {
      partnership = await Partnership.create({
        mentorId: user1.id,
        menteeId: user2.id
      });

      // 查找新创建的 partnership
      const foundPartnership = await Partnership.findOne({
        where: {
          mentorId: user1.id,
          menteeId: user2.id
        }
      });

      // 确认找到的partnership存在
      expect(foundPartnership).to.exist;
      });




    // //删除行为开始
    // //由于数据库设置，删除user前必须删除partnership，所以无法通过删除user对partnership进行cascade delete

    it('should delete the partnership and verify deletion', async () => {
      // TODO: 数据库依赖冲突？目前使用force进行删除
      await partnership.destroy({force:true});

      const foundPartnership = await Partnership.findOne({
        where: { mentorId: user1.id, menteeId: user2.id },
      });

      expect(foundPartnership).to.be.null;
    });


    // it('should delete user1 and all related partnerships', async () => {
    //   await user1.destroy();

    //   const findUser1 = await User.findByPk(user1.id);
    //   expect(findUser1).to.be.null;

    //   const findPartnership = await Partnership.findOne({
    //     where: {
    //       mentorId: user1.id,
    //       menteeId: user2.id
    //     }
    //   });
    //   expect(findPartnership).to.be.null;
    // });

    // 删除user2以测试是否删除了group中的groupUser
    it('should delete user2 and all related GroupUser instances', async () => {
      await user2.destroy();

      const findUser2 = await User.findByPk(user2.id);
      expect(findUser2).to.be.null;

      const findUser2inGroup = await GroupUser.findAll({
        where: { userId: user2.id }
      });
      expect(findUser2inGroup).to.have.lengthOf(0);

    });

    // 使用force彻底删除测试用例
    it('should delete test user1 and test group', async () => {
      await User.destroy({ where: { name: '测试用户一' }, force: true });
      await User.destroy({ where: { name: '测试用户二' }, force: true });
      await Group.destroy({ where: { name: 'testgroup' }, force: true });

      const foundUser1 = await User.findOne({ where: { name: '测试用户一' } });
      expect(foundUser1).to.be.null;
      const foundUser2 = await User.findOne({ where: { name: '测试用户二' } });
      expect(foundUser2).to.be.null;
      const foundGroup = await Group.findOne({ where: { name: 'testgroup' } });
      expect(foundGroup).to.be.null;
    });
  });
});
