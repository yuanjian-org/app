import { procedure, router } from "../trpc";
import { authIntegration } from "../auth";
import db from "../database/db";
import { z } from "zod";
import { 
  interviewFeedbackAttributes,
  mentorshipAttributes,
  minUserAttributes,
} from "api/database/models/attributesAndIncludes";
import { formatUserName } from "shared/strings";
import { MenteeStatus } from "shared/MenteeStatus";
import Interview from "api/database/models/Interview";
import { Feedback } from "shared/InterviewFeedback";

/**
 * Return interview data for the mentees who are 1) in the "现届学子" status and 
 * 2) have no ongoing mentorship. Usage:
 *
 * $ curl -H "Authorization: Bearer ${INTEGRATION_AUTH_TOKEN}" \
 *  "${BASE_URL}/api/v1/matchmaker.listPendingMentees"
 *
 */
const listPendingMentees = procedure
  .use(authIntegration())
  .output(z.array(z.object({
    menteeName: z.string(),
    averageDimensionalScores: z.record(z.string(), z.number()),
  })))
  .query(async () => 
{
  // Declare a variable to force type checking
  const menteeStatus: MenteeStatus = "现届学子";
  const mentees = await db.User.findAll({ 
    attributes: minUserAttributes,
    where: { menteeStatus },
    include: [{
      association: "mentorshipsAsMentee",
      attributes: mentorshipAttributes,
    }, {
      association: "interviews",
      attributes: ["type"],
      include: [{
        association: "feedbacks",
        attributes: interviewFeedbackAttributes,
      }],
    }],
  });

  const pendingMentees = mentees.filter(mentee => {
    return mentee.mentorshipsAsMentee.filter(
      mentorship => mentorship.endedAt === null).length == 0;
  });

  return pendingMentees.map(m => ({
    menteeName: formatUserName(m.name),
    averageDimensionalScores: getAverageDimensionalScores(m.interviews),
  }));
});

function getAverageDimensionalScores(interviews: Interview[]):
  Record<string, number>
{
  const d2scores: Record<string, number[]> = {};
  interviews.filter(i => i.type == "MenteeInterview").map(i => {
    i.feedbacks.map(f => {
      const dimensions = (f.feedback as Feedback)?.dimensions;
      dimensions && dimensions.map(d => {
        if (d.name && d.name !== "总评" && d.score) {
          d2scores[d.name] = [d.score, ...d2scores[d.name] || []];
        }
      });
    });
  });

  const ret: Record<string, number> = {};
  Object.entries(d2scores).map(en => {
    const avg = en[1].reduce((a, b) => a + b, 0) / en[1].length;
    ret[en[0]] = avg;
  });
  return ret;
}

export default router({
  listPendingMentees,
});
