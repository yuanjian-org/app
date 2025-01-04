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
    ['薛东', '2024-01-30T07:53:34Z'],
    ['孙西振', '2024-01-30T12:27:34Z'],
    ['李西灵', '2024-01-30T14:12:17Z'],
    ['王思佳', '2024-01-30T22:50:07Z'],
    ['何飔雨', '2024-02-02T14:04:01Z'],
    ['乐一帆', '2024-02-03T08:53:07Z'],
    ['陈玮', '2024-02-03T17:45:22Z'],
    ['宋洁', '2024-02-04T10:42:02Z'],
    ['蔡晓妍', '2024-02-04T11:09:11Z'],
    ['董雯磊', '2024-02-04T13:09:57Z'],
    ['邹玉俊', '2024-02-05T07:59:34Z'],
    ['吕大春', '2024-02-05T11:11:01Z'],
    ['张立同', '2024-02-05T19:09:04Z'],
    ['王逸鸣', '2024-02-05T23:10:09Z'],
    ['石远星', '2024-02-05T23:29:48Z'],
    ['吴熙昌', '2024-02-06T02:18:29Z'],
    ['党硕东', '2024-02-06T05:18:13Z'],
    ['邹有龄', '2024-02-06T13:55:21Z'],
    ['夏华悦', '2024-02-06T14:29:13Z'],
    ['雷迪', '2024-02-06T14:58:23Z'],
    ['孙炳有', '2024-02-07T02:24:48Z'],
    ['白雪', '2024-02-07T03:33:10Z'],
    ['张元圆', '2024-02-07T13:37:29Z'],
    ['李禹肖', '2024-02-08T11:18:34Z'],
    ['郭婧', '2024-02-08T16:07:37Z'],
    ['孔潇潇', '2024-02-10T08:52:00Z'],
    ['方建', '2024-02-21T14:02:28Z'],
    ['高志鹏', '2024-04-14T08:06:25Z'],
    ['王勍', '2024-04-15T18:40:41Z'],
    ['陆倩云', '2024-05-29T14:09:23Z'],
  ];

  for (const [name, time] of items) {
    const user = await db.User.findOne({ where: { name } });
    if (!user) {
      console.log(`User ${name} not found`);
      continue;
    }
    await user.update({ state: {
      ...user.state,
      handbookExam: moment(time).toDate(),
    } });
  }

  // A no-op promise for when this function has no actual work to do to suppress
  // build error.
  await Promise.resolve();
}
