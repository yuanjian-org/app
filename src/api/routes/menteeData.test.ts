import { expect } from "chai";
import { Transaction } from "sequelize";
import AdmZip from "adm-zip";
import {
  menteeUniqueQualityField,
  menteeIsFirstTierField,
} from "../../shared/applicationFields";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { AI_MEETING_TRANSCRIPT_KEY, AI_MINUTES_SUMMARY_KEY } from "./summaries";
import {
  downloadMenteeDataImpl,
  downloadMenteeTranscriptsImpl,
} from "./menteeData";

describe("menteeData download functions", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction?.rollback();
  });

  describe("downloadMenteeDataImpl", () => {
    it("should generate complete ZIP package with all mentee data", async () => {
      // Create test mentee
      const mentee = await db.User.create(
        {
          email: `mentee-${Date.now()}@test.com`,
          name: "测试学生",
          roles: ["Mentee"],
          menteeApplication: {
            field1: "Application data 1",
            field2: "Application data 2",
            录取届: "2024",
            就读专业: "计算机科学",
            就读种类: "本科",
            预计毕业年份: "2028",
            大学一年级入学年份: "2024",
            [menteeUniqueQualityField]: "坚韧不拔",
            [menteeIsFirstTierField]: "是",
          },
          menteeStatus: "现届学子",
        },
        { transaction },
      );

      // Create interviewer and interview with feedback
      const interviewer = await db.User.create(
        {
          email: `interviewer-${Date.now()}@test.com`,
          name: "测试面试官",
          roles: ["Interviewer"],
        },
        { transaction },
      );

      // Note: Interview.decision uses zFeedback schema
      const interview = await db.Interview.create(
        {
          type: "MenteeInterview",
          intervieweeId: mentee.id,
          decision: {
            dimensions: [{ name: "能力", score: 5, comment: "通过" }],
          },
          createdAt: new Date("2024-01-10"),
        },
        { transaction },
      );

      await db.InterviewFeedback.create(
        {
          interviewId: interview.id,
          interviewerId: interviewer.id,
          feedback: {
            dimensions: [
              {
                name: "表达能力",
                score: 5,
                comment: "Line 1\nLine 2\nLine 3",
              },
            ],
          },
          feedbackUpdatedAt: new Date("2024-01-12"),
        },
        { transaction },
      );

      // Create internal notes (chat messages)
      const mentor = await db.User.create(
        {
          email: `mentor-${Date.now()}@test.com`,
          name: "测试导师",
          roles: ["Mentor"],
        },
        { transaction },
      );

      const chatRoom = await db.ChatRoom.create(
        {
          menteeId: mentee.id,
        },
        { transaction },
      );

      await db.ChatMessage.create(
        {
          roomId: chatRoom.id,
          userId: mentor.id,
          markdown: "Second note",
          createdAt: new Date("2024-02-05"),
        },
        { transaction },
      );

      await db.ChatMessage.create(
        {
          roomId: chatRoom.id,
          userId: mentor.id,
          markdown: "First note",
          createdAt: new Date("2024-02-01"),
        },
        { transaction },
      );

      // Create mentorship with transcripts
      const mentorship = await db.Mentorship.create(
        {
          mentorId: mentor.id,
          menteeId: mentee.id,
          transactional: false,
        },
        { transaction },
      );

      const group = await db.Group.create(
        {
          name: "Test Group",
          partnershipId: mentorship.id,
        },
        { transaction },
      );

      // Create transcripts in reverse order to test sorting
      const transcript2Id = `transcript-2-${Date.now()}`;
      await db.Transcript.create(
        {
          id: transcript2Id,
          groupId: group.id,
          startedAt: new Date("2024-03-15T10:00:00Z"),
          endedAt: new Date("2024-03-15T11:00:00Z"),
        },
        { transaction },
      );

      await db.Summary.create(
        {
          transcriptId: transcript2Id,
          key: AI_MINUTES_SUMMARY_KEY,
          markdown: "Second meeting summary",
          initialLength: 100,
          deletedLength: 0,
        },
        { transaction },
      );

      const transcript1Id = `transcript-1-${Date.now()}`;
      await db.Transcript.create(
        {
          id: transcript1Id,
          groupId: group.id,
          startedAt: new Date("2024-03-01T10:00:00Z"),
          endedAt: new Date("2024-03-01T11:00:00Z"),
        },
        { transaction },
      );

      await db.Summary.create(
        {
          transcriptId: transcript1Id,
          key: AI_MINUTES_SUMMARY_KEY,
          markdown: "First meeting summary",
          initialLength: 100,
          deletedLength: 0,
        },
        { transaction },
      );

      // Generate the ZIP package
      const result = await downloadMenteeDataImpl(mentee.id, transaction);

      // Verify filename format uses anonymous ID (YY-NNN format)
      expect(result.filename).to.match(/^mentee_data_\d{2}-\d{3}\.zip$/);
      expect(result.filename).to.not.include(mentee.name);
      expect(result.filename).to.not.include(mentee.id);

      // Decode base64 and extract ZIP
      const zipBuffer = Buffer.from(result.data, "base64");
      const zip = new AdmZip(zipBuffer);
      const zipEntries = zip.getEntries();

      // Verify all expected files are present
      const fileNames = zipEntries.map((entry) => entry.entryName);
      expect(fileNames).to.include("metadata.json");
      expect(fileNames).to.include("menteeApplication.json");
      expect(fileNames).to.include("menteeApplication.txt");
      expect(fileNames).to.include("interviewResults.json");
      expect(fileNames).to.include("interviewResults.txt");
      expect(fileNames).to.include("internalNotes.json");
      expect(fileNames).to.include("internalNotes.txt");
      expect(fileNames).to.include("mentorships.json");
      void expect(fileNames.some((name) => name.startsWith("mentorship_"))).to
        .be.true;

      // Verify metadata.json
      const metadataEntry = zip.getEntry("metadata.json");
      const metadata = JSON.parse(metadataEntry!.getData().toString("utf8"));
      expect(metadata.userId).to.equal(mentee.id);
      void expect("userName" in metadata).to.be.false;
      expect(metadata.generatedAt).to.be.a("string");
      expect(metadata.files).to.be.an("array");
      expect(metadata.files.length).to.be.greaterThan(0);

      // Verify menteeApplication.json
      const appEntry = zip.getEntry("menteeApplication.json");
      const appData = JSON.parse(appEntry!.getData().toString("utf8"));
      expect(appData.field1).to.equal("【保护】");
      expect(appData.field2).to.equal("【保护】");
      expect(appData["录取届"]).to.equal("2024");
      expect(appData["就读专业"]).to.equal("计算机科学");
      expect(appData["就读种类"]).to.equal("本科");
      expect(appData["预计毕业年份"]).to.equal("2028");
      expect(appData["大学一年级入学年份"]).to.equal("2024");
      expect(appData[menteeUniqueQualityField]).to.equal("坚韧不拔");
      expect(appData[menteeIsFirstTierField]).to.equal("是");

      // Verify menteeApplication.txt
      const appTxtEntry = zip.getEntry("menteeApplication.txt");
      const appTxt = appTxtEntry!.getData().toString("utf8");
      expect(appTxt).to.include("【保护】");
      expect(appTxt).to.include("计算机科学");
      expect(appTxt).to.include("2024");
      expect(appTxt).to.include("坚韧不拔");
      expect(appTxt).to.not.include(mentee.name);
      expect(appTxt).to.not.include("学生: ");

      // Verify interviewResults.json
      const interviewEntry = zip.getEntry("interviewResults.json");
      const interviewsJson = interviewEntry!.getData().toString("utf8");
      const interviews = JSON.parse(interviewsJson);
      const decision = interviews[0].decision;
      expect(decision.dimensions[0].comment).to.equal("通过");
      expect(decision.dimensions[0].name).to.equal("能力");
      expect(interviews[0].feedbacks).to.be.an("array");
      expect(interviews[0].feedbacks.length).to.equal(1);
      const fb0 = interviews[0].feedbacks[0];
      expect(fb0.interviewer.name).to.equal("测试面试官");
      expect(fb0.feedback.dimensions[0].score).to.equal(5);
      expect(interviewsJson).to.not.include(mentee.name);

      // Verify interviewResults.txt
      const interviewTxt = zip
        .getEntry("interviewResults.txt")!
        .getData()
        .toString("utf8");
      expect(interviewTxt).to.include("测试面试官");
      expect(interviewTxt).to.include("score: 5");
      expect(interviewTxt).to.include("comment:");
      expect(interviewTxt).to.include("Line 1");
      expect(interviewTxt).to.include("Line 2");
      expect(interviewTxt).to.include("Line 3");
      expect(interviewTxt).to.not.include(mentee.name);
      expect(interviewTxt).to.not.include("学生: ");
      expect(interviewTxt).to.include("dimensions:");
      expect(interviewTxt).to.include("name: 能力");
      expect(interviewTxt).to.include("score: 5");

      // Verify internalNotes.json
      const notesEntry = zip.getEntry("internalNotes.json");
      const notes = JSON.parse(notesEntry!.getData().toString("utf8"));
      expect(notes).to.be.an("array");
      expect(notes.length).to.equal(2);
      expect(notes[0].markdown).to.equal("First note");
      expect(notes[1].markdown).to.equal("Second note");

      // Verify internalNotes.txt
      const notesTxt = zip
        .getEntry("internalNotes.txt")!
        .getData()
        .toString("utf8");
      expect(notesTxt).to.include("First note");
      expect(notesTxt).to.include("Second note");
      expect(notesTxt).to.not.include(mentee.name);
      expect(notesTxt).to.not.include("学生: ");

      // Verify mentorships.json
      const mentorshipsEntry = zip.getEntry("mentorships.json");
      const transcriptSummaries = JSON.parse(
        mentorshipsEntry!.getData().toString("utf8"),
      );
      expect(transcriptSummaries).to.be.an("array");
      const testSummaries = transcriptSummaries.filter(
        (s: any) => s.mentor.name === "测试导师",
      );
      expect(testSummaries.length).to.equal(2);
      expect(testSummaries[0].summary).to.equal("First meeting summary");
      expect(testSummaries[1].summary).to.equal("Second meeting summary");

      // Verify mentorship txt file
      const mentorshipTxtFile = fileNames.find((name) =>
        name.startsWith("mentorship_"),
      );
      void expect(mentorshipTxtFile).to.be.a("string");
      const mentorshipTxt = zip
        .getEntry(mentorshipTxtFile!)!
        .getData()
        .toString("utf8");
      expect(mentorshipTxt).to.include("测试导师");
      expect(mentorshipTxt).to.include("First meeting summary");
      expect(mentorshipTxt).to.include("Second meeting summary");
      expect(mentorshipTxt).to.not.include(mentee.name);
    });
  });

  describe("downloadMenteeTranscriptsImpl", () => {
    it("should generate raw transcript ZIP with fallback to summary", async () => {
      // Create test mentee
      const mentee = await db.User.create(
        {
          email: `mentee-tr-${Date.now()}@test.com`,
          name: "张小三",
          roles: ["Mentee"],
          menteeApplication: {
            录取届: "2024",
          },
          menteeStatus: "现届学子",
        },
        { transaction },
      );

      const mentor = await db.User.create(
        {
          email: `mentor-tr-${Date.now()}@test.com`,
          name: "李导师",
          roles: ["Mentor"],
        },
        { transaction },
      );

      const mentorship = await db.Mentorship.create(
        {
          mentorId: mentor.id,
          menteeId: mentee.id,
          transactional: false,
        },
        { transaction },
      );

      const group = await db.Group.create(
        {
          name: "Transcript Group",
          partnershipId: mentorship.id,
        },
        { transaction },
      );

      // Meeting 1: Has raw transcript AND summary (should use raw transcript)
      const transcript1Id = `tr-1-${Date.now()}`;
      await db.Transcript.create(
        {
          id: transcript1Id,
          groupId: group.id,
          startedAt: new Date("2024-04-01T10:00:00Z"),
          endedAt: new Date("2024-04-01T11:00:00Z"),
        },
        { transaction },
      );

      await db.Summary.create(
        {
          transcriptId: transcript1Id,
          key: AI_MEETING_TRANSCRIPT_KEY,
          markdown: "This is raw meeting transcript for 张小三 in meeting 1.",
          initialLength: 100,
          deletedLength: 0,
        },
        { transaction },
      );

      await db.Summary.create(
        {
          transcriptId: transcript1Id,
          key: AI_MINUTES_SUMMARY_KEY,
          markdown: "Meeting 1 summary.",
          initialLength: 50,
          deletedLength: 0,
        },
        { transaction },
      );

      // Meeting 2: Has ONLY meeting summary (should fallback to summary)
      const transcript2Id = `tr-2-${Date.now()}`;
      await db.Transcript.create(
        {
          id: transcript2Id,
          groupId: group.id,
          startedAt: new Date("2024-04-10T10:00:00Z"),
          endedAt: new Date("2024-04-10T11:00:00Z"),
        },
        { transaction },
      );

      await db.Summary.create(
        {
          transcriptId: transcript2Id,
          key: AI_MINUTES_SUMMARY_KEY,
          markdown: "Meeting 2 summary for fallback.",
          initialLength: 50,
          deletedLength: 0,
        },
        { transaction },
      );

      // Generate the transcripts ZIP package
      const result = await downloadMenteeTranscriptsImpl(
        mentee.id,
        transaction,
      );

      // Verify filename format
      expect(result.filename).to.match(/^mentee_transcripts_\d{2}-\d{3}\.zip$/);

      // Decode base64 and extract ZIP
      const zipBuffer = Buffer.from(result.data, "base64");
      const zip = new AdmZip(zipBuffer);
      const zipEntries = zip.getEntries();

      // Verify zip ONLY contains mentorship txt file
      const fileNames = zipEntries.map((e) => e.entryName);
      expect(fileNames.length).to.equal(1);
      const expectedFileName = `mentorship_${mentor.name}_${mentorship.id}.txt`;
      expect(fileNames[0]).to.equal(expectedFileName);

      // Verify text file content
      const txtContent = zip
        .getEntry(expectedFileName)!
        .getData()
        .toString("utf8");

      expect(txtContent).to.include(`导师: ${mentor.name}`);
      expect(txtContent).to.include(`小组: Transcript Group`);
      expect(txtContent).to.include(`师生关系ID: ${mentorship.id}`);

      // Meeting 1 raw transcript content
      expect(txtContent).to.include(
        "This is raw meeting transcript for 学生 in meeting 1.",
      );
      // Name anonymized
      expect(txtContent).to.not.include("张小三");

      // Meeting 2 fallback summary content
      expect(txtContent).to.include("Meeting 2 summary for fallback.");
    });
  });
});
