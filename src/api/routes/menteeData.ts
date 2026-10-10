import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { notFoundError } from "../errors";
import sequelize from "../database/sequelize";
import { AI_MEETING_TRANSCRIPT_KEY, AI_MINUTES_SUMMARY_KEY } from "./summaries";
import archiver from "archiver";
import { Op, Transaction } from "sequelize";
import { getAnonymousId } from "../../shared/getAnonymousId";
import {
  menteeAcceptanceYearField,
  menteeMajorField,
  menteeDegreeField,
  menteeExpectedGraduationYearField,
  menteeFirstYearInCollegeField,
  menteeExpectationField,
  menteeUniqueQualityField,
  menteeIsFirstTierField,
  menteeCoopRecommendField,
  menteeProudExperienceField,
  menteeCommunityExperienceField,
  menteeIdealField,
} from "../../shared/applicationFields";

/**
 * Generate a unique 6-character anonymous ID for a user.
 *
 * Format: YY-NNN
 * - YY: Last 2 digits of acceptance year (录取届)
 * - NNN: 3-digit hash derived from userId (000-999)
 *
 * @param userId - The user's UUID
 * @param acceptanceYear - The acceptance year (e.g., "2024")
 * @returns A 6-character string (e.g., "24-437")
 */

/**
 * Anonymize user names by replacing all occurrences with "学生".
 * Replaces both the full name and the last two characters of the name.
 *
 * @param content - The content to anonymize (string)
 * @param userName - The user's full name (nullable)
 * @returns Anonymized content
 */
function anonymizeUserName(content: string, userName: string | null): string {
  if (!userName) return content;

  // Replace full name
  let result = content.replace(new RegExp(userName, "g"), "学生");

  // Also replace last two characters of the name if length > 2
  if (userName.length > 2) {
    const lastTwoChars = userName.slice(-2);
    result = result.replace(new RegExp(lastTwoChars, "g"), "学生");
  }

  return result;
}

/**
 * Download mentee data as a ZIP package containing:
 * 1. metadata.json - Metadata including userId, userName, generatedAt, etc.
 * 2. menteeApplication.json - Mentee application data from Users table
 * 3. menteeApplication.txt - Human-readable version of mentee application
 * 4. interviewResults.json - Interview results with all interviewer feedback
 * 5. interviewResults.txt - Human-readable version of interview results
 * 6. internalNotes.json - All messages from internal notes chat (内部笔记)
 * 7. internalNotes.txt - Human-readable version of internal notes
 * 8. mentorships.json - All AI meeting summaries (智能纪要)
 * 9. mentorship_[mentorName]_[mentorshipId].txt - Plain text file for each
 *    mentorship containing all transcript summaries
 *
 * Returns a base64-encoded ZIP file containing all data as separate files.
 */
const downloadMenteeData = procedure
  .use(authUser("UserAdmin"))
  .input(z.string())
  .output(
    z.object({
      filename: z.string(),
      data: z.string(), // base64 encoded zip data
    }),
  )
  .query(async ({ input: userId }) => {
    return await sequelize.transaction(async (transaction) => {
      return await downloadMenteeDataImpl(userId, transaction);
    });
  });

/**
 * Download raw meeting transcripts of a mentee as a ZIP package containing
 * only plain text files for each mentorship:
 * mentorship_[mentorName]_[mentorshipId].txt
 */
const downloadMenteeTranscripts = procedure
  .use(authUser("UserAdmin"))
  .input(z.string())
  .output(
    z.object({
      filename: z.string(),
      data: z.string(), // base64 encoded zip data
    }),
  )
  .query(async ({ input: userId }) => {
    return await sequelize.transaction(async (transaction) => {
      return await downloadMenteeTranscriptsImpl(userId, transaction);
    });
  });

// Helper function to format values for plain text output
function formatValue(value: any, indent: string = ""): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "string") {
    // Handle multi-line strings by putting all lines on new lines with
    // extra indentation
    const lines = value.split("\n");
    if (lines.length > 1) {
      return "\n" + lines.map((line) => `${indent}  ${line}`).join("\n");
    }
    return value;
  }
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return "[]";
      }
      // Check if array contains objects
      if (typeof value[0] === "object") {
        let result = "\n";
        value.forEach((item, idx) => {
          // Add empty line before each item except the first
          if (idx > 0) {
            result += "\n";
          }
          Object.entries(item).forEach(([k, v]) => {
            const formattedValue = formatValue(v, indent + "  ");
            if (formattedValue.startsWith("\n")) {
              result += `${indent}  ${k}:${formattedValue}\n`;
            } else {
              result += `${indent}  ${k}: ${formattedValue}\n`;
            }
          });
        });
        return result;
      } else {
        return value.join(", ");
      }
    } else {
      // Plain object
      let result = "\n";
      Object.entries(value).forEach(([k, v]) => {
        result += `${indent}  ${k}: ${formatValue(v, indent + "  ")}\n`;
      });
      return result;
    }
  }
  return String(value);
}

// Helper function to redact private information from mentee application
function redactMenteeApplication(application: any): {
  redacted: any;
  redactedText: string;
} {
  if (!application || typeof application !== "object") {
    return {
      redacted: null,
      redactedText: "无申请数据\n",
    };
  }

  const allowedFields = [
    menteeAcceptanceYearField,
    menteeMajorField,
    menteeDegreeField,
    menteeExpectedGraduationYearField,
    menteeFirstYearInCollegeField,
    menteeUniqueQualityField,
    menteeIsFirstTierField,
    menteeCoopRecommendField,
    menteeProudExperienceField,
    menteeCommunityExperienceField,
    menteeIdealField,
    menteeExpectationField,
  ];

  const redacted: any = {};
  let redactedText = "";

  for (const [key, value] of Object.entries(application)) {
    if (allowedFields.includes(key)) {
      // Keep allowed fields as-is
      redacted[key] = value;
      redactedText += `${key}:\n`;
      if (typeof value === "object" && value !== null) {
        redactedText += `${JSON.stringify(value, null, 2)}\n`;
      } else {
        redactedText += `${value}\n`;
      }
    } else {
      // Redact all other fields
      redacted[key] = "【保护】";
      redactedText += `${key}:\n【保护】\n`;
    }
    redactedText += `\n`;
  }

  return { redacted, redactedText };
}

/**
 * Build a base64-encoded ZIP file from a list of files, anonymizing content
 * for the given userName.
 */
async function buildZipArchive(
  files: Array<{ name: string; content: string }>,
  userName: string | null,
): Promise<string> {
  const archive = archiver("zip", {
    zlib: { level: 9 }, // Maximum compression
  });

  const chunks: Uint8Array[] = [];

  archive.on("data", (chunk: Uint8Array) => {
    chunks.push(chunk);
  });

  const zipPromise = new Promise<Buffer>((resolve, reject) => {
    archive.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    archive.on("error", (err) => {
      reject(err);
    });
  });

  for (const file of files) {
    archive.append(anonymizeUserName(file.content, userName), {
      name: file.name,
    });
  }

  await archive.finalize();
  const zipBuffer = await zipPromise;
  return zipBuffer.toString("base64");
}

/**
 * Fetch mentorships and format plain text files for each mentorship.
 *
 * @param userId - The mentee user ID
 * @param contentType - "summaries" for meeting summaries only, or
 *                      "transcripts" for raw transcripts (fallback to
 *                      summaries if raw transcript is absent).
 * @param transaction - Sequelize transaction
 */
async function fetchMentorshipTextFiles(
  userId: string,
  contentType: "summaries" | "transcripts",
  transaction: Transaction,
) {
  const summaryKeys =
    contentType === "summaries"
      ? [AI_MINUTES_SUMMARY_KEY]
      : [AI_MEETING_TRANSCRIPT_KEY, AI_MINUTES_SUMMARY_KEY];

  const mentorships = await db.Mentorship.findAll({
    where: { menteeId: userId },
    attributes: ["id", "mentorId"],
    include: [
      {
        model: db.User,
        as: "mentor",
        attributes: ["id", "name"],
      },
      {
        model: db.Group,
        attributes: ["id", "name"],
        include: [
          {
            model: db.Transcript,
            attributes: ["id", "startedAt", "endedAt"],
            include: [
              {
                model: db.Summary,
                where: { key: { [Op.in]: summaryKeys } },
                required: false,
                attributes: ["key", "markdown"],
              },
            ],
          },
        ],
      },
    ],
    order: [
      [
        { model: db.Group, as: "group" },
        { model: db.Transcript, as: "transcripts" },
        "startedAt",
        "ASC",
      ],
    ], // Sort transcripts by oldest first
    transaction,
  });

  const transcriptSummaries = mentorships.flatMap((mentorship) => {
    if (!mentorship.group || !mentorship.group.transcripts) return [];

    return mentorship.group.transcripts
      .filter((transcript) => transcript.summaries.length > 0)
      .map((transcript) => {
        const summary =
          transcript.summaries.find((s) => s.key === AI_MINUTES_SUMMARY_KEY) ||
          transcript.summaries[0];
        return {
          mentorshipId: mentorship.id,
          mentor: {
            id: mentorship.mentor.id,
            name: mentorship.mentor.name,
          },
          groupName: mentorship.group.name,
          transcriptId: transcript.id,
          startedAt: transcript.startedAt,
          endedAt: transcript.endedAt,
          summary: summary?.markdown || null,
        };
      });
  });

  const mentorshipTextFiles: Array<{
    filename: string;
    content: string;
  }> = [];

  for (const mentorship of mentorships) {
    if (!mentorship.group || !mentorship.group.transcripts) continue;

    const meetingsWithContent: Array<{
      transcript: (typeof mentorship.group.transcripts)[0];
      content: string;
    }> = [];

    for (const transcript of mentorship.group.transcripts) {
      if (contentType === "transcripts") {
        const rawTranscript = transcript.summaries.find(
          (s) => s.key === AI_MEETING_TRANSCRIPT_KEY && s.markdown,
        );
        const fallbackSummary = transcript.summaries.find(
          (s) => s.key === AI_MINUTES_SUMMARY_KEY && s.markdown,
        );
        const selected = rawTranscript || fallbackSummary;
        if (selected) {
          meetingsWithContent.push({
            transcript,
            content: selected.markdown,
          });
        }
      } else {
        const summary = transcript.summaries.find(
          (s) => s.key === AI_MINUTES_SUMMARY_KEY && s.markdown,
        );
        if (summary) {
          meetingsWithContent.push({
            transcript,
            content: summary.markdown,
          });
        }
      }
    }

    if (meetingsWithContent.length === 0) continue;

    let textContent = `导师: ${mentorship.mentor.name}\n`;
    textContent += `小组: ${mentorship.group.name || "未命名"}\n`;
    textContent += `师生关系ID: ${mentorship.id}\n`;
    textContent += `生成时间: ${new Date().toISOString()}\n`;
    textContent += `\n${"=".repeat(80)}\n\n`;

    meetingsWithContent.forEach(({ transcript, content }, index) => {
      textContent += `会议 ${index + 1}\n`;
      textContent += `会议ID: ${transcript.id}\n`;
      textContent += `开始时间: ${transcript.startedAt}\n`;
      textContent += `结束时间: ${transcript.endedAt}\n`;
      textContent += `\n${content}\n`;
      textContent += `\n${"-".repeat(80)}\n\n`;
    });

    const filename = `mentorship_${mentorship.mentor.name}_${mentorship.id}.txt`;
    mentorshipTextFiles.push({ filename, content: textContent });
  }

  return {
    mentorships,
    transcriptSummaries,
    mentorshipTextFiles,
  };
}

export async function downloadMenteeDataImpl(
  userId: string,
  transaction: Transaction,
): Promise<{ filename: string; data: string }> {
  // Get user
  const user = await db.User.findByPk(userId, {
    attributes: ["id", "name", "menteeApplication"],
    transaction,
  });

  if (!user) throw notFoundError("用户", userId);

  // 1. Mentee Application - redact private information
  const { redacted: redactedMenteeApplication, redactedText } =
    redactMenteeApplication(user.menteeApplication);
  const menteeApplication = redactedMenteeApplication;

  // 2. Interview Results with Feedback
  const interviews = await db.Interview.findAll({
    where: { intervieweeId: userId, type: "MenteeInterview" },
    attributes: ["id", "type", "decision", "decisionUpdatedAt", "createdAt"],
    include: [
      {
        model: db.InterviewFeedback,
        attributes: ["feedback", "feedbackUpdatedAt"],
        include: [
          {
            model: db.User,
            as: "interviewer",
            attributes: ["id", "name"],
          },
        ],
      },
    ],
    order: [["createdAt", "ASC"]], // Sort by oldest first
    transaction,
  });

  const interviewResults = interviews.map((interview) => ({
    interviewId: interview.id,
    type: interview.type,
    decision: interview.decision,
    decisionUpdatedAt: interview.decisionUpdatedAt,
    createdAt: interview.createdAt,
    feedbacks: interview.feedbacks.map((fb) => ({
      interviewer: {
        id: fb.interviewer.id,
        name: fb.interviewer.name,
      },
      feedback: fb.feedback,
      feedbackUpdatedAt: fb.feedbackUpdatedAt,
    })),
  }));

  // 3. Internal Notes (内部笔记)
  const chatRoom = await db.ChatRoom.findOne({
    where: { menteeId: userId },
    attributes: ["id"],
    include: [
      {
        model: db.ChatMessage,
        attributes: ["id", "markdown", "createdAt", "updatedAt"],
        include: [
          {
            model: db.User,
            attributes: ["id", "name"],
          },
        ],
      },
    ],
    transaction,
  });

  const internalNotes = chatRoom
    ? chatRoom.messages
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
        .map((msg) => ({
          messageId: msg.id,
          author: {
            id: msg.user.id,
            name: msg.user.name,
          },
          markdown: msg.markdown,
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt,
        }))
    : [];

  // 4. Transcript Summaries from all mentorships
  const { transcriptSummaries, mentorshipTextFiles } =
    await fetchMentorshipTextFiles(userId, "summaries", transaction);

  // Create plain text version of mentee application
  let menteeApplicationText = `学生申请表\n`;
  menteeApplicationText += `生成时间: ${new Date().toISOString()}\n`;
  menteeApplicationText += `\n${"=".repeat(80)}\n\n`;

  menteeApplicationText += redactedText;

  // Create plain text version of interview results
  let interviewResultsText = `面试结果\n`;
  interviewResultsText += `生成时间: ${new Date().toISOString()}\n`;
  interviewResultsText += `\n${"=".repeat(80)}\n\n`;

  if (interviewResults.length === 0) {
    interviewResultsText += `无面试记录\n`;
  } else {
    interviewResults.forEach((interview, idx) => {
      interviewResultsText += `面试 ${idx + 1}\n`;
      interviewResultsText += `面试ID: ${interview.interviewId}\n`;
      interviewResultsText += `类型: ${interview.type}\n`;
      if (interview.decision) {
        interviewResultsText += `决定:\n`;
        Object.entries(interview.decision).forEach(([key, value]) => {
          const formattedValue = formatValue(value, "  ");
          if (formattedValue.startsWith("\n")) {
            interviewResultsText += `  ${key}:${formattedValue}`;
          } else {
            interviewResultsText += `  ${key}: ${formattedValue}\n`;
          }
        });
      }
      if (interview.decisionUpdatedAt) {
        interviewResultsText += `决定更新时间: ${interview.decisionUpdatedAt}\n`;
      }
      interviewResultsText += `\n面试官反馈:\n`;

      if (interview.feedbacks.length === 0) {
        interviewResultsText += `  无反馈\n`;
      } else {
        interview.feedbacks.forEach((fb, fbIdx) => {
          interviewResultsText += `\n  反馈 ${fbIdx + 1}\n`;
          interviewResultsText += `  面试官: ${fb.interviewer.name}\n`;
          interviewResultsText += `  面试官ID: ${fb.interviewer.id}\n`;
          if (fb.feedbackUpdatedAt) {
            interviewResultsText += `  反馈更新时间: ${fb.feedbackUpdatedAt}\n`;
          }
          if (fb.feedback) {
            interviewResultsText += `  反馈内容:\n`;
            Object.entries(fb.feedback).forEach(([key, value]) => {
              const formattedValue = formatValue(value, "    ");
              if (formattedValue.startsWith("\n")) {
                interviewResultsText += `    ${key}:${formattedValue}`;
              } else {
                interviewResultsText += `    ${key}: ${formattedValue}\n`;
              }
            });
          }
        });
      }
      interviewResultsText += `\n${"-".repeat(80)}\n\n`;
    });
  }

  // Create plain text version of internal notes
  let internalNotesText = `内部笔记\n`;
  internalNotesText += `生成时间: ${new Date().toISOString()}\n`;
  internalNotesText += `\n${"=".repeat(80)}\n\n`;

  if (internalNotes.length === 0) {
    internalNotesText += `无内部笔记\n`;
  } else {
    internalNotes.forEach((note, idx) => {
      internalNotesText += `消息 ${idx + 1}\n`;
      internalNotesText += `作者: ${note.author.name}\n`;
      internalNotesText += `作者ID: ${note.author.id}\n`;
      internalNotesText += `创建时间: ${note.createdAt}\n`;
      internalNotesText += `更新时间: ${note.updatedAt}\n`;
      internalNotesText += `\n${note.markdown}\n`;
      internalNotesText += `\n${"-".repeat(80)}\n\n`;
    });
  }

  // Create metadata
  const metadata = {
    userId,
    generatedAt: new Date().toISOString(),
    files: [
      "menteeApplication.json",
      "menteeApplication.txt",
      "interviewResults.json",
      "interviewResults.txt",
      "internalNotes.json",
      "internalNotes.txt",
      "mentorships.json",
      ...mentorshipTextFiles.map((f) => f.filename),
    ],
  };

  const filesToZip: Array<{ name: string; content: string }> = [
    { name: "metadata.json", content: JSON.stringify(metadata, null, 2) },
    {
      name: "menteeApplication.json",
      content: JSON.stringify(menteeApplication, null, 2),
    },
    { name: "menteeApplication.txt", content: menteeApplicationText },
    {
      name: "interviewResults.json",
      content: JSON.stringify(interviewResults, null, 2),
    },
    { name: "interviewResults.txt", content: interviewResultsText },
    {
      name: "internalNotes.json",
      content: JSON.stringify(internalNotes, null, 2),
    },
    { name: "internalNotes.txt", content: internalNotesText },
    {
      name: "mentorships.json",
      content: JSON.stringify(transcriptSummaries, null, 2),
    },
    ...mentorshipTextFiles.map((f) => ({
      name: f.filename,
      content: f.content,
    })),
  ];

  const base64Data = await buildZipArchive(filesToZip, user.name);

  // Generate anonymous ID for filename
  const acceptanceYear =
    user.menteeApplication?.[menteeAcceptanceYearField] || null;
  const anonymousId = getAnonymousId(userId, acceptanceYear);

  return {
    filename: `mentee_data_${anonymousId}.zip`,
    data: base64Data,
  };
}

export async function downloadMenteeTranscriptsImpl(
  userId: string,
  transaction: Transaction,
): Promise<{ filename: string; data: string }> {
  // Get user
  const user = await db.User.findByPk(userId, {
    attributes: ["id", "name", "menteeApplication"],
    transaction,
  });

  if (!user) throw notFoundError("用户", userId);

  // Fetch mentorship text files containing raw meeting transcripts
  // (with fallback to meeting summaries)
  const { mentorshipTextFiles } = await fetchMentorshipTextFiles(
    userId,
    "transcripts",
    transaction,
  );

  const filesToZip = mentorshipTextFiles.map((f) => ({
    name: f.filename,
    content: f.content,
  }));

  const base64Data = await buildZipArchive(filesToZip, user.name);

  // Generate anonymous ID for filename
  const acceptanceYear =
    user.menteeApplication?.[menteeAcceptanceYearField] || null;
  const anonymousId = getAnonymousId(userId, acceptanceYear);

  return {
    filename: `mentee_transcripts_${anonymousId}.zip`,
    data: base64Data,
  };
}

export default router({
  downloadMenteeData,
  downloadMenteeTranscripts,
});
