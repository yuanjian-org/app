import { Op } from "sequelize";
import User from "../src/api/database/models/User";
import sequelizeInstance from "../src/api/database/sequelizeInstance";
import { createGroup, findGroups } from "../src/api/routes/groups";
import { TRPCError } from "@trpc/server";
import invariant from "tiny-invariant";
import _ from "lodash";
import moment from "moment";
import Role, { AllRoles } from "../src/shared/Role";
import { toPinyin } from "../src/shared/strings";
import Transcript from "../src/api/database/models/Transcript";
import Summary from "../src/api/database/models/Summary";
import { alreadyExistsErrorMessage } from "../src/api/errors";

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
  
  await migrateRoles();
  const mgrs = await getUserManagers();
  if (mgrs.length == 0) {
    console.error('ERROR: No uesr is found. Please follow README.md and log into your local server first.');
    process.exit(1);
  }
  await upgradeUsers(mgrs);
  await generateUsers();
  await generateGroupsAndSummaries(mgrs);
}

async function migrateRoles()
{
  console.log('Migrating roles column');
  await sequelizeInstance.query(`update users set roles = '[]' where roles = '["VISITOR"]'`);
  await sequelizeInstance.query(`update users set roles = '["UserManager"]' where roles = '["ADMIN"]'`);
  await sequelizeInstance.query(`update users set roles = '["SummaryEngineer"]' where roles = '["AIResearcher"]'`);
}

async function upgradeUsers(users: User[]) {
  console.log('Upgrading user roles for', users.map(u => u.email));
  for (const user of users) {
    await user.update({
      roles: [...AllRoles],
    });
  }
}

async function generateUsers() {
  for (const u of allUsers) {
    console.log('Creating user', [u.name]);
    u.id = (await User.upsert({
      name: u.name,
      pinyin: toPinyin(u.name),
      email: u.email,
      clientId: u.email,
      roles: [],
    }))[0].id;
  }
}

async function generateGroupsAndSummaries(include: User[]) {
  await generateGroup([...include, mentees[0]]);
  await generateGroup([...include, mentees[1]]);
  await generateGroup([...include, mentees[0], mentees[1]]);
  await generateGroup([...include, mentors[0]]);

  await generateSummaries([...include, mentees[1]]);
  await generateSummaries([...include, mentors[0]]);
}

async function getUserManagers() {
  // Use type system to capture typos.
  const role : Role = "UserManager";
  return await User.findAll({ where: {
    roles: { [Op.contains]: [role] },
  } });
}

async function generateGroup(users: TestUser[]) {
  invariant(users.length > 1);
  console.log('Creating group', users.map(u => u.name));
  try {
    await createGroup(users.map(u => u.id as string));
  } catch (e) {
    if (!(e instanceof TRPCError && e.message === alreadyExistsErrorMessage("分组"))) throw e;
  }
}

async function generateSummaries(users: TestUser[]) {
  console.log('Creating summaries for', users.map(u => u.name));
  const groups = await findGroups(users.map(u => u.id as string), 'exclusive');
  invariant(groups.length == 1);
  const gid = groups[0].id;

  const start = moment('2023-6-20', 'YYYY-MM-DD');
  const end = start.clone().add(33, 'minute');

  const md = '\n\n### 三号标题\n正文**加粗**.\n\n1. 列表*斜体*\n2. 列表~~划掉~~';
  await upsertSummary(gid, `transcript-1-${gid}`, start.valueOf(), end.valueOf(), 'summary-A',
    '> transcript-1, summary-A' + md);
  await upsertSummary(gid, `transcript-1-${gid}`, start.valueOf(), end.valueOf(), 'summary-B',
    '> transcript-1, summary-B' + md);
  await upsertSummary(gid, `transcript-1-${gid}`, start.valueOf(), end.valueOf(), 'summary-C',
    '> transcript-1, summary-C' + md);

  const anotherStart = start.clone().add(3, 'day');
  const anotherEnd = anotherStart.clone().add(1, 'hour');
  await upsertSummary(gid, `transcript-2-${gid}`, anotherStart.valueOf(), anotherEnd.valueOf(), 'summary-A',
    '> transcript-2, summary-A' + md);
}

async function upsertSummary(groupId: string, transcriptId: string, startedAt: number, endedAt: number,
  summaryKey: string, summary: string) {
  await Transcript.upsert({
    transcriptId,
    groupId,
    startedAt,
    endedAt
  });
  await Summary.upsert({
    transcriptId,
    summaryKey,
    summary
  });
}