import { Op, Transaction } from "sequelize";
import { createGroup, findGroups } from "./groups";
import invariant from "tiny-invariant";
import moment from "moment";
import demoData, { DemoUser } from "./demoData";
import { createMentorship } from "./mentorships";
import { DateColumn } from "../../shared/DateColumn";
import db from "../database/db";
import createKudos from "./kudosInternal";
import { AI_MINUTES_SUMMARY_KEY, saveSummaryImpl } from "./summaries";
import { createChatMessage, findOrCreateRoom } from "./chatsInternal";
import User from "../../shared/User";
import { createCalibration } from "./calibrations";
import _ from "lodash";
import { createInterview, getInterviewIdForMentee } from "./interviews";
import { createAutoTask } from "./tasks";
import { createMentorBooking } from "./mentorBookings";
import { checkAndComputeUserFields } from "./users";
import { isPermitted } from "../../shared/Role";
import { hash } from "bcryptjs";

const demo = _.cloneDeep(demoData);
const admin = demo.users.admin;
const mentee1 = demo.users.mentee1;
const mentee2 = demo.users.mentee2;
const mentee3 = demo.users.mentee3;
const mentor1 = demo.users.mentor1;
const mentor2 = demo.users.mentor2;
const mentor3 = demo.users.mentor3;
const mentor4 = demo.users.mentor4;
const mentor5 = demo.users.mentor5;

function id(u: DemoUser): string {
  return u.id as string;
}

export async function generateDemoData(t: Transaction) {
  await generateUsersAndAssingIds(t);

  await generateGroup([admin, mentor1, mentor2], "导师内部讨论", t);
  await generateGroup([admin, mentee1, mentee2, mentor1], "学生分享会", t);

  const endsAt = moment().add(1, "months").toISOString();
  const group1 = await generateMentorship(admin, mentee1, false, null, t);
  if (group1) {
    await generateSummaries(group1, t);
    // TODO: Add transaction to isPermittedtoAccessMentee() and move this line
    // to after group2 is created and use mentor1 instead of admin as the author.
    await generateMenteeNotes(admin, mentee1, t);
  }
  const group2 = await generateMentorship(mentor1, mentee1, false, null, t);
  if (group2) {
    await generateSummaries(group2, t);
  }
  const group3 = await generateMentorship(admin, mentee2, true, endsAt, t);
  if (group3) {
    await generateSummaries(group3, t);
    await generateMenteeNotes(admin, mentee2, t);
  }
  await generateMentorship(mentor5, mentee3, true, endsAt, t);

  console.log("Creating kudos...");
  await createKudos(id(mentor1), id(mentor2), null, t);
  await createKudos(
    id(admin),
    id(mentor2),
    "感谢大乙一直以个人名义继续支持已经毕业的学生 💖",
    t,
  );
  await createKudos(
    id(mentor1),
    id(mentor3),
    "多亏了小丙同学的及时雨，我们才按时完成了师生初配的打分工作 🏃‍♂️🏃‍♂️",
    t,
  );
  await createKudos(id(mentor4), id(mentor2), null, t);
  await createKudos(id(admin), id(mentor1), null, t);

  await generateCalibrationAndInterviews(t);

  await createAutoTasks(t);

  await generateMentorBookings(t);
}

async function generateUsersAndAssingIds(transaction: Transaction) {
  for (const u of Object.values(demo.users) as DemoUser[]) {
    const existing = await db.User.findOne({
      where: { email: u.email },
      attributes: ["id"],
      transaction,
    });

    const hashedPassword = u.password ? await hash(u.password, 10) : undefined;

    if (existing) {
      u.id = existing.id;
      if (hashedPassword) {
        await db.User.update(
          { password: hashedPassword },
          { where: { id: u.id }, transaction },
        );
      }
    } else {
      console.log(`Creating user "${u.name}"...`);
      const created = await db.User.create(
        {
          ...u,
          password: hashedPassword,
          ...(await checkAndComputeUserFields({
            ...u,
            isVolunteer: isPermitted(u.roles ?? [], "Volunteer"),
            oldUrl: null,
            transaction,
          })),
        },
        { transaction },
      );
      u.id = created.id;
    }
  }
}

async function generateGroup(
  users: DemoUser[],
  name: string | null,
  transaction: Transaction,
) {
  invariant(users.length > 1);
  const userIds = users.map((u) => id(u));
  if ((await findGroupsByType("Unowned", userIds)).length != 0) return;

  console.log(
    `Creating group "${name}" for ${users.map((u) => u.name).join(", ")}...`,
  );
  await createGroup(name, userIds, null, null, transaction);
}

/**
 * @returns the created group id or null if the mentorship already exists
 */
async function generateMentorship(
  mentor: DemoUser,
  mentee: DemoUser,
  transactional: boolean,
  endsAt: DateColumn | null,
  t: Transaction,
) {
  const count = await db.Mentorship.count({
    where: {
      mentorId: id(mentor),
      menteeId: id(mentee),
    },
    transaction: t,
  });
  if (count > 0) return;

  console.log(`Creating mentorship for ${mentor.name} and ${mentee.name}...`);
  return await createMentorship(
    id(mentor),
    id(mentee),
    transactional,
    endsAt,
    t,
  );
}

async function generateSummaries(groupId: string, t: Transaction) {
  console.log("Creating summary for group", groupId);

  for (const [idx, summary] of demo.summaries.entries()) {
    console.log(`Creating summary ${idx} for group ${groupId}...`);
    await saveSummaryImpl(
      `transcript-${groupId}-${idx}`,
      groupId,
      summary.startedAt,
      summary.endedAt,
      AI_MINUTES_SUMMARY_KEY,
      summary.md,
      t,
    );
  }
}

async function generateMenteeNotes(
  author: DemoUser,
  mentee: DemoUser,
  transaction: Transaction,
) {
  console.log("Creating mentee notes...");
  const room = await findOrCreateRoom(
    author as User,
    id(mentee),
    "write",
    transaction,
  );
  for (const note of demo.menteeNotes) {
    await createChatMessage(author as User, room.id, note, transaction);
  }
}

async function generateCalibrationAndInterviews(t: Transaction) {
  const c = demo.calibration;
  const existing = await db.Calibration.findOne({
    where: { name: c.name },
    attributes: ["id"],
    transaction: t,
  });

  let calibrationId: string;
  if (existing) {
    calibrationId = existing.id;
  } else {
    console.log(`Creating calibration "${c.name}"...`);
    calibrationId = await createCalibration("MenteeInterview", c.name, true, t);
  }

  for (const interview of c.interviews) {
    if (await getInterviewIdForMentee(id(interview.interviewee), t)) continue;

    console.log(`Creating interview for ${interview.interviewee.name}...`);
    const interviewId = await createInterview(
      "MenteeInterview",
      calibrationId,
      id(interview.interviewee),
      interview.interviewers.map((u) => id(u.user)),
      t,
    );

    // Interview feedbacks
    for (const i of interview.interviewers) {
      console.log(`Creating interview feedback...`);
      await db.InterviewFeedback.update(
        {
          feedback: i.feedback,
        },
        {
          where: { interviewId, interviewerId: id(i.user) },
          transaction: t,
        },
      );
    }

    // Interview decision
    await db.Interview.update(
      {
        decision: interview.decision,
      },
      {
        where: { id: interviewId },
        transaction: t,
      },
    );
  }
}

/**
 * Checking fields of IDs to return matching exclusive groups
 * Calibration Groups are excluded since they do not have userIds
 */
async function findGroupsByType(
  groupType: "Unowned" | "Interview" | "Mentorship",
  userIds: string[],
) {
  if (groupType == "Interview") {
    return await findGroups(userIds, "exclusive", undefined, {
      interviewId: { [Op.ne]: null },
      partnershipId: { [Op.is]: null },
    });
  }

  if (groupType == "Mentorship") {
    return await findGroups(userIds, "exclusive", undefined, {
      interviewId: { [Op.is]: null },
      partnershipId: { [Op.ne]: null },
    });
  }

  // Default Unowned Group
  return await findGroups(userIds, "exclusive", undefined, {
    interviewId: { [Op.is]: null },
    partnershipId: { [Op.is]: null },
  });
}

async function createAutoTasks(t: Transaction) {
  console.log("Creating auto tasks...");
  await createAutoTask(id(admin), "study-comms", t);
  await createAutoTask(id(admin), "study-handbook", t);
}

async function generateMentorBookings(t: Transaction) {
  console.log("Creating mentor bookings...");
  await createMentorBooking(
    mentee1 as User,
    id(mentor4),
    "希望交流目前医药行业的现状和未来职业规划",
    "http://localhost:3000",
    t,
    "demo",
  );
}
