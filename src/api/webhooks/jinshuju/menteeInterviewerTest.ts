import db from "../../database/db";

// Webhook for https://jsj.top/f/w02l95
export default async function submit(entry: Record<string, any>) {
  const name = entry.field_1;
  if (entry.exam_score < 120) {
    console.log(`MenteeInterviewerTest not passed for ${name}. Igored.`);
    return;
  }

  // There may be multiple users under the same name because users may have used
  // wrong email to sign up. Update all of them.
  const us = await db.User.findAll({
    where: { name }
  });
  
  for (const u of us) {
    u.menteeInterviewerTestLastPassedAt = new Date().toISOString();
    await u.save();
  }
}
