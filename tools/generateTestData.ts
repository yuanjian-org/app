import { Op } from "sequelize";
import User from "../src/api/database/models/User";
import sequelize from "../src/api/database/sequelize";
import { createGroup, findGroups } from "../src/api/routes/groups";
import invariant from "tiny-invariant";
import _ from "lodash";
import moment from "moment";
import Role, { AllRoles } from "../src/shared/Role";
import { toPinyin } from "../src/shared/strings";
import Transcript from "../src/api/database/models/Transcript";
import Summary from "../src/api/database/models/Summary";
import { createInterview } from "../src/api/routes/interviews";
import Calibration from "../src/api/database/models/Calibration";
import {
  volunteerApplyingforMentorField, volunteerApplyingforMentorFieldYes
} from "../src/shared/applicationFields";

type TestUser = {
  name: string | null,
  email: string,
  id?: string,
  volunteerApplication?: Record<string, any> | null,
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
  volunteerApplication: {
    [volunteerApplyingforMentorField]: volunteerApplyingforMentorFieldYes
  },
}, {
  name: '丁导师',
  email: 'mentor-b@test.foo',
  volunteerApplication: {
    [volunteerApplyingforMentorField]: volunteerApplyingforMentorFieldYes
  },
}];

const allUsers = [...mentees, ...mentors];

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main().then();

async function main() {
  let users = await getUserManagers();
  if (users.length == 0) {
    users = await User.findAll();
    if (users.length !== 1) {
      console.error('ERROR: Zero or multiple users are found and none of them are UserManagers. Please follow README.md and log into your local server first.');
      process.exit(1);
    }
  }

  await upgradeUsers(users);
  await generateUsers();
  await generateGroupsAndSummaries(users);
  const calibration = await findOrCreateCalibration();
  await generateInterview(users, calibration);
  
  // This make sure the process doesn't hang waiting for connection closure.
  await sequelize.close();
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
      pinyin: toPinyin(u.name ?? ""),
      email: u.email,
      roles: [],
      volunteerApplication: u.volunteerApplication || null,
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
  const role: Role = "UserManager";
  return await User.findAll({ where: {
    roles: { [Op.contains]: [role] },
  } });
}

async function generateGroup(users: TestUser[]) {
  invariant(users.length > 1);
  console.log('Creating group', users.map(u => u.name));
  const userIds = users.map(u => u.id as string);
  if ((await findGroupsByType("Unowned", userIds)).length != 0) return;
  await sequelize.transaction(async t =>
    await createGroup(null, userIds, null, null, null, null, t));
}

async function generateSummaries(users: TestUser[]) {
  console.log('Creating summaries for', users.map(u => u.name));
  const groups = await findGroupsByType("Unowned", users.map(u => u.id as string));
  invariant(groups.length == 1);
  const gid = groups[0].id;

  const start = moment('2023-6-20', 'YYYY-MM-DD');
  const end = start.clone().add(33, 'minute');

  let md = '\n\n### 三号标题\n正文**加粗**.\n\n1. 列表*斜体*\n2. 列表~~划掉~~\n\n';
  for (let i = 0; i < users.length; i++) {
    md = md + `{{name${i}}}\n\n`;
  }
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

async function findOrCreateCalibration() {
  console.log("Creating Test MenteeIntervew Calibration");
  const [menteeCalibration, menteeCalibrationCreated] = await Calibration.findOrCreate({
    where: {
      type: 'MenteeInterview',
      name: '面试组A',
    },
    defaults: { active: true, }
  });

  await sequelize.transaction(async t => {
    if (menteeCalibrationCreated) {
      await createGroup(null, [], null, null, menteeCalibration.id, null, t);
    }
  });

  return { menteeCalibration };
}

async function generateInterview(users: User[], calibrations: { menteeCalibration: { id: string; } }) {
  const userIds = users.map(u => u.id as string);
  for (const tu of allUsers) {
    invariant(tu.id);
    if (tu.email.includes('mentee')) {
      console.log(`Creating MenteeInterview for [${users.map(u => u.name)}, ${tu.name}]`);
      if ((await findGroupsByType("Interview", [tu.id, ...userIds])).length != 0) continue;
      await createInterview("MenteeInterview", calibrations.menteeCalibration.id, tu.id, [...userIds]);
    };
  }
}

// Checking fields of IDs to return matching exclusive groups
// Calibration Groups are excluded since they do not have userIds
async function findGroupsByType(groupType: "Unowned" | "Interview" | "Partnership" | "Coachee", userIds: string[]) {

  if (groupType == "Interview") {
    return await findGroups(userIds, 'exclusive', undefined, {
      interviewId: { [Op.ne]: null },
      partnershipId: { [Op.is]: null },
      coacheeId: { [Op.is]: null },
      calibrationId: { [Op.is]: null }
    });
  }

  if (groupType == "Partnership") {
    return await findGroups(userIds, 'exclusive', undefined, {
      interviewId: { [Op.is]: null },
      partnershipId: { [Op.ne]: null },
      coacheeId: { [Op.is]: null },
      calibrationId: { [Op.is]: null }
    });
  }

  if (groupType == "Coachee") {
    return await findGroups(userIds, 'exclusive', undefined, {
      interviewId: { [Op.is]: null },
      partnershipId: { [Op.is]: null },
      coacheeId: { [Op.ne]: null },
      calibrationId: { [Op.is]: null }
    });
  }

  // Default Unowned Group
  return await findGroups(userIds, 'exclusive', undefined, {
    interviewId: { [Op.is]: null },
    partnershipId: { [Op.is]: null },
    coacheeId: { [Op.is]: null },
    calibrationId: { [Op.is]: null }
  });
}