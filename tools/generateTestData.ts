import { Op } from "sequelize";
import User from "../src/api/database/models/User";
import sequelizeInstance from "../src/api/database/sequelizeInstance";
import pinyin from 'tiny-pinyin';
import { GROUP_ALREADY_EXISTS_ERROR_MESSAGE, createGroup } from "../src/api/routes/groups";
import { TRPCError } from "@trpc/server";
import invariant from "tiny-invariant";
import Group from "../src/api/database/models/Group";
import GroupUser from "../src/api/database/models/GroupUser";
import _ from "lodash";
import { upsertSummary } from "../src/api/routes/summaries";
import moment from "moment";

type TestUser = {
  name: string,
  email: string,
  id?: string,
};

const mentees: TestUser[] = [{
  name: '甲学生',
  email: 'mentee-c@test.foo',
}, {
  name: '乙学生',
  email: 'mentee-d@test.foo',
}];

const mentors: TestUser[] = [{
  name: '丙导师',
  email: 'mentor-a@test.foo',
}, {
  name: '丁导师',
  email: 'mentor-b@test.foo',
}];

const allUsers = [...mentees, ...mentors];

main().then();

async function main() {
  // Force sequelize initialization
  const _ = sequelizeInstance;
  
  await generateUsers();
  await generateGroupsAndSummaries();
}

async function generateUsers() {
  for (const u of allUsers) {
    console.log('Creating user', [u.name]);
    u.id = (await User.upsert({
      name: u.name,
      pinyin: pinyin.convertToPinyin(u.name),
      email: u.email,
      clientId: u.email,
      roles: ['VISITOR'],
    }))[0].id;
  }
}

async function generateGroupsAndSummaries() {
  const admins = await getAdmins();
  await generateGroup([...admins, mentees[0]]);
  await generateGroup([...admins, mentees[1]]);
  await generateGroup([...admins, mentees[0], mentees[1]]);
  await generateGroup([...admins, mentors[0]]);

  await generateSummaries([...admins, mentees[1]]);
  await generateSummaries([...admins, mentors[0]]);
}

async function getAdmins() {
  return await User.findAll({ where: {
    roles: { [Op.contains]: ["ADMIN"] },
  } });
}

async function generateGroup(users: TestUser[]) {
  invariant(users.length > 1);
  console.log('Creating group', users.map(u => u.name));
  try {
    await createGroup(users.map(u => u.id as string));
  } catch (e) {
    if (!(e instanceof TRPCError && e.message === GROUP_ALREADY_EXISTS_ERROR_MESSAGE)) throw e;
  }
}

async function generateSummaries(users: TestUser[]) {
  console.log('Creating summaries for', users.map(u => u.name));
  const groupId = await findGroupId(users);
  invariant(groupId);

  const start = moment('2023-6-20', 'YYYY-MM-DD');
  const end = start.clone().add(33, 'minute');

  const md = '\n\n### 三号标题\n正文**加粗**.\n\n1. 列表*斜体*\n2. 列表~~划掉~~';
  await upsertSummary(groupId, `transcript-1-${groupId}`, start.valueOf(), end.valueOf(), 'summary-A',
    '> transcript-1, summary-A' + md);
  await upsertSummary(groupId, `transcript-1-${groupId}`, start.valueOf(), end.valueOf(), 'summary-B',
    '> transcript-1, summary-B' + md);
  await upsertSummary(groupId, `transcript-1-${groupId}`, start.valueOf(), end.valueOf(), 'summary-C',
    '> transcript-1, summary-C' + md);

  const anotherStart = start.clone().add(3, 'day');
  const anotherEnd = anotherStart.clone().add(1, 'hour');
  await upsertSummary(groupId, `transcript-2-${groupId}`, anotherStart.valueOf(), anotherEnd.valueOf(), 'summary-A',
    '> transcript-2, summary-A' + md);
}

async function findGroupId(users: TestUser[]) {
  invariant(users.length > 1);

  const gus = await GroupUser.findAll({
    where: {
      userId: users[0].id as string,
    },
    include: [{
      model: Group,
      attributes: ['id'],
      include: [{
        model: GroupUser,
        attributes: ['userId'],
      }]
    }]
  })

  for (const gu of gus) {
    const set1 = new Set(gu.group.groupUsers.map(gu => gu.userId));
    const set2 = new Set(users.map(u => u.id));
    if (_.isEqual(set1, set2)) return gu.groupId;
  }
  return null;
}
