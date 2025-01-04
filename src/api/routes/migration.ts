import sequelize from "../database/sequelize";
import { procedure, router } from "../trpc";
import { authIntegration } from "../auth";
import db from "../database/db";
import moment from "moment";

export default router({
  // TODO: Should we require an Admin auth token separate from integration
  // token?
  migrateDatabase: procedure
    .use(authIntegration())
    .mutation(async () => await migrateDatabase())
});

export async function migrateDatabase() {
  console.log("Migrating DB schema...");

  migrateSchema();
  await sequelize.sync({ alter: { drop: false } });
  await migrateData();
  await cleanupLogs();
}

async function cleanupLogs() {
  console.log("Clean up old logs...");
  await sequelize.query(`
    DELETE FROM "EventLogs"
    WHERE "createdAt" < NOW() - INTERVAL '1 year';
  `);
  await sequelize.query(`
    DELETE FROM "InterviewFeedbackUpdateAttempts"
    WHERE "createdAt" < NOW() - INTERVAL '30 days';
  `);
}

function migrateSchema() {
  console.log("Migrating DB schema...");
}

async function migrateData() {
  console.log("Migrating DB data...");

  const items = [
    ['薛东', '2024-01-30T08:24:07Z'],
    ['李西灵', '2024-01-30T13:44:14Z'],
    ['王思佳', '2024-01-30T22:51:29Z'],
    ['何飔雨', '2024-02-02T13:47:59Z'],
    ['乐一帆', '2024-02-03T08:50:51Z'],
    ['陈玮', '2024-02-03T17:25:56Z'],
    ['宋洁', '2024-02-04T10:34:37Z'],
    ['蔡晓妍', '2024-02-05T02:46:40Z'],
    ['邹玉俊', '2024-02-05T06:46:06Z'],
    ['吕大春', '2024-02-05T11:18:37Z'],
    ['董雯磊', '2024-02-05T17:36:32Z'],
    ['张立同', '2024-02-05T18:52:16Z'],
    ['王逸鸣', '2024-02-05T23:18:26Z'],
    ['石远星', '2024-02-05T23:33:39Z'],
    ['吴熙昌', '2024-02-06T02:25:06Z'],
    ['党硕东', '2024-02-06T05:21:34Z'],
    ['邹有龄', '2024-02-06T13:51:18Z'],
    ['夏华悦', '2024-02-06T14:33:26Z'],
    ['雷迪', '2024-02-06T15:03:16Z'],
    ['孙炳有', '2024-02-07T08:19:51Z'],
    ['白雪', '2024-02-07T08:39:15Z'],
    ['张元圆', '2024-02-07T13:41:37Z'],
    ['李禹肖', '2024-02-08T11:24:26Z'],
    ['郭婧', '2024-02-08T16:14:05Z'],
    ['孔潇潇', '2024-02-10T08:59:25Z'],
    ['高志鹏', '2024-04-13T19:09:16Z'],
    ['王勍', '2024-04-15T18:58:26Z'],
    ['陆倩云', '2024-05-29T13:54:15Z'],
  ];

  for (const [name, time] of items) {
    const user = await db.User.findOne({ where: { name } });
    if (!user) {
      console.log(`User ${name} not found`);
      continue;
    }
    await user.update({ state: {
      ...user.state,
      commsExam: moment(time).toDate(),
    } });
  }

  // A no-op promise for when this function has no actual work to do to suppress
  // build error.
  await Promise.resolve();
}
