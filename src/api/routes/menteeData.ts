import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { notFoundError } from "../errors";
import sequelize from "../database/sequelize";
import { AI_MINUTES_SUMMARY_KEY } from "./summaries";
import archiver from "archiver";
import { Transaction } from "sequelize";
import {
  menteeAcceptanceYearField,
  menteeMajorField,
  menteeDegreeField,
  menteeExpectedGraduationYearField,
  menteeFirstYearInCollegeField,
} from "../../shared/applicationFields";

/**
 * Generate a unique 6-character anonymous ID for a user.
 *
 * Format: YY-NNN
 * - YY: Last 2 digits of acceptance year (录取届)
 * - NNN: 3-digit hash derived from userId (000-999)
 *
 * This allows humans to regenerate the ID knowing the acceptance year and userId.
 *
 * @param userId - The user's UUID
 * @param acceptanceYear - The acceptance year (e.g., "2024")
 * @returns A 6-character string (e.g., "24-437")
 */
export function getAnonymousId(
  userId: string,
  acceptanceYear: string | null,
): string {
  // First 2 digits: last 2 digits of acceptance year
  const yearSuffix = acceptanceYear ? acceptanceYear.slice(-2) : "00"; // Default to "00" if no acceptance year

  // Last 3 digits: deterministic hash of userId
  // Use a simple hash: sum of character codes mod 1000
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) % 1000;
  }

  // Ensure it's always 3 digits with leading zeros if needed
  const userSuffix = hash.toString().padStart(3, "0");

  return yearSuffix + "-" + userSuffix;
}

/**
 * Download mentee data as a ZIP package containing:
 * 1. metadata.json - Metadata including userId, userName, generatedAt, and file list
 * 2. menteeApplication.json - Mentee application data from Users table
 * 3. menteeApplication.txt - Human-readable version of mentee application
 * 4. interviewResults.json - Interview results with all interviewer feedback
 * 5. interviewResults.txt - Human-readable version of interview results
 * 6. internalNotes.json - All messages from the internal notes chat room (内部笔记)
 * 7. internalNotes.txt - Human-readable version of internal notes
 * 8. mentorships.json - All AI meeting summaries (智能纪要) from mentorships
 * 9. mentorship_[mentorName]_[mentorshipId].txt - Plain text file for each mentorship
 *    containing all transcript summaries with key 智能纪要
 *
 * Returns a base64-encoded ZIP file containing all data as separate files.
 */
const downloadMenteeData = procedure
  .use(authUser("UserManager"))
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

// Helper function to format values for plain text output
function formatValue(value: any, indent: string = ""): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "string") {
    // Handle multi-line strings by putting all lines on new lines with extra indentation
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
            attributes: ["transcriptId", "startedAt", "endedAt"],
            include: [
              {
                model: db.Summary,
                where: { key: AI_MINUTES_SUMMARY_KEY },
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
      .map((transcript) => ({
        mentorshipId: mentorship.id,
        mentor: {
          id: mentorship.mentor.id,
          name: mentorship.mentor.name,
        },
        groupName: mentorship.group.name,
        transcriptId: transcript.transcriptId,
        startedAt: transcript.startedAt,
        endedAt: transcript.endedAt,
        summary: transcript.summaries[0]?.markdown || null,
      }));
  });

  // Prepare plain text files for each mentorship
  const mentorshipTextFiles: Array<{
    filename: string;
    content: string;
  }> = [];

  for (const mentorship of mentorships) {
    if (!mentorship.group || !mentorship.group.transcripts) continue;

    const summariesWithContent = mentorship.group.transcripts.filter(
      (transcript) => transcript.summaries.length > 0,
    );

    if (summariesWithContent.length === 0) continue;

    let textContent = `导师: ${mentorship.mentor.name}\n`;
    textContent += `小组: ${mentorship.group.name || "未命名"}\n`;
    textContent += `师徒关系ID: ${mentorship.id}\n`;
    textContent += `生成时间: ${new Date().toISOString()}\n`;
    textContent += `\n${"=".repeat(80)}\n\n`;

    summariesWithContent.forEach((transcript, index) => {
      const summary = transcript.summaries[0];
      textContent += `会议 ${index + 1}\n`;
      textContent += `会议ID: ${transcript.transcriptId}\n`;
      textContent += `开始时间: ${transcript.startedAt}\n`;
      textContent += `结束时间: ${transcript.endedAt}\n`;
      textContent += `\n${summary.markdown}\n`;
      textContent += `\n${"-".repeat(80)}\n\n`;
    });

    const filename = `mentorship_${mentorship.mentor.name}_${mentorship.id}.txt`;
    mentorshipTextFiles.push({ filename, content: textContent });
  }

  // Create plain text version of mentee application
  let menteeApplicationText = `学生申请表\n`;
  menteeApplicationText += `学生: ${user.name}\n`;
  menteeApplicationText += `学生ID: ${userId}\n`;
  menteeApplicationText += `生成时间: ${new Date().toISOString()}\n`;
  menteeApplicationText += `\n${"=".repeat(80)}\n\n`;

  menteeApplicationText += redactedText;

  // Create plain text version of interview results
  let interviewResultsText = `面试结果\n`;
  interviewResultsText += `学生: ${user.name}\n`;
  interviewResultsText += `学生ID: ${userId}\n`;
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
  internalNotesText += `学生: ${user.name}\n`;
  internalNotesText += `学生ID: ${userId}\n`;
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
    userName: user.name,
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

  // Create ZIP archive
  const archive = archiver("zip", {
    zlib: { level: 9 }, // Maximum compression
  });

  const chunks: Uint8Array[] = [];

  // Collect ZIP data into chunks
  archive.on("data", (chunk: Uint8Array) => {
    chunks.push(chunk);
  });

  // Wait for archive to finish
  const zipPromise = new Promise<Buffer>((resolve, reject) => {
    archive.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    archive.on("error", (err) => {
      reject(err);
    });
  });

  // Add files to archive
  archive.append(JSON.stringify(metadata, null, 2), {
    name: "metadata.json",
  });
  archive.append(JSON.stringify(menteeApplication, null, 2), {
    name: "menteeApplication.json",
  });
  archive.append(menteeApplicationText, {
    name: "menteeApplication.txt",
  });
  archive.append(JSON.stringify(interviewResults, null, 2), {
    name: "interviewResults.json",
  });
  archive.append(interviewResultsText, {
    name: "interviewResults.txt",
  });
  archive.append(JSON.stringify(internalNotes, null, 2), {
    name: "internalNotes.json",
  });
  archive.append(internalNotesText, {
    name: "internalNotes.txt",
  });
  archive.append(JSON.stringify(transcriptSummaries, null, 2), {
    name: "mentorships.json",
  });

  // Add plain text files for each mentorship
  for (const { filename, content } of mentorshipTextFiles) {
    archive.append(content, { name: filename });
  }

  // Finalize the archive
  await archive.finalize();

  // Wait for ZIP to complete
  const zipBuffer = await zipPromise;

  // Convert to base64
  const base64Data = zipBuffer.toString("base64");

  return {
    filename: `mentee_data_${user.name}_${userId}.zip`,
    data: base64Data,
  };
}

export default router({
  downloadMenteeData,
});
