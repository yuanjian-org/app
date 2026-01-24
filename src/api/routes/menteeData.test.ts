import { expect } from "chai";
import { Transaction } from "sequelize";
import AdmZip from "adm-zip";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { AI_MINUTES_SUMMARY_KEY } from "./summaries";
import { downloadMenteeDataImpl, getAnonymousId } from "./menteeData";

describe("generateAnonymousId", () => {
  it("should generate a 6-character ID with acceptance year prefix and hyphen", () => {
    const userId = "12345678-1234-1234-1234-123456789abc";
    const acceptanceYear = "2024";

    const id = getAnonymousId(userId, acceptanceYear);

    expect(id).to.be.a("string");
    expect(id.length).to.equal(6);
    expect(id.startsWith("24-")).to.equal(true);
  });

  it("should generate consistent IDs for the same inputs", () => {
    const userId = "12345678-1234-1234-1234-123456789abc";
    const acceptanceYear = "2024";

    const id1 = getAnonymousId(userId, acceptanceYear);
    const id2 = getAnonymousId(userId, acceptanceYear);

    expect(id1).to.equal(id2);
  });

  it("should generate different IDs for different users with same year", () => {
    const userId1 = "12345678-1234-1234-1234-123456789abc";
    const userId2 = "87654321-4321-4321-4321-cba987654321";
    const acceptanceYear = "2024";

    const id1 = getAnonymousId(userId1, acceptanceYear);
    const id2 = getAnonymousId(userId2, acceptanceYear);

    expect(id1).to.not.equal(id2);
    expect(id1.substring(0, 3)).to.equal(id2.substring(0, 3)); // Same year prefix with hyphen
  });

  it("should handle null acceptance year with default 00", () => {
    const userId = "12345678-1234-1234-1234-123456789abc";

    const id = getAnonymousId(userId, null);

    expect(id.startsWith("00-")).to.equal(true);
    expect(id.length).to.equal(6);
  });

  it("should handle different year formats correctly", () => {
    const userId = "12345678-1234-1234-1234-123456789abc";

    const id2023 = getAnonymousId(userId, "2023");
    const id2024 = getAnonymousId(userId, "2024");

    expect(id2023.startsWith("23-")).to.equal(true);
    expect(id2024.startsWith("24-")).to.equal(true);
    // Last 3 digits should be the same (same userId)
    expect(id2023.substring(3)).to.equal(id2024.substring(3));
  });

  it("should always generate 3-digit hash with leading zeros if needed", () => {
    // Test multiple user IDs to ensure padding works
    for (let i = 0; i < 10; i++) {
      const userId = `test-user-${i}`;
      const id = getAnonymousId(userId, "2024");
      expect(id.length).to.equal(6);
      expect(id).to.match(/^\d{2}-\d{3}$/); // Format: YY-NNN
    }
  });
});

describe("downloadMenteeDataImpl", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

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

    const interview = await db.Interview.create(
      {
        type: "MenteeInterview",
        intervieweeId: mentee.id,
        decision: {
          decision: "通过",
          dimensions: [{ name: "能力", score: 5 }],
        },
        createdAt: new Date("2024-01-10"),
      },
      { transaction },
    );

    await db.InterviewFeedback.create(
      {
        interviewId: interview.id,
        interviewerId: interviewer.id,
        feedback: { rating: 5, comment: "Line 1\nLine 2\nLine 3" },
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

    // Create transcripts in reverse order to test chronological sorting
    const transcript2Id = `transcript-2-${Date.now()}`;
    await db.Transcript.create(
      {
        transcriptId: transcript2Id,
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
        transcriptId: transcript1Id,
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

    // Verify filename format
    expect(result.filename).to.include(mentee.name);
    expect(result.filename).to.include(mentee.id);
    expect(result.filename).to.include(".zip");

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
    expect(fileNames.some((name) => name.startsWith("mentorship_"))).to.equal(
      true,
    );

    // Verify metadata.json
    const metadataEntry = zip.getEntry("metadata.json");
    const metadata = JSON.parse(metadataEntry!.getData().toString("utf8"));
    expect(metadata.userId).to.equal(mentee.id);
    expect(metadata.userName).to.equal(mentee.name);
    expect(metadata.generatedAt).to.be.a("string");
    expect(metadata.files).to.be.an("array");
    expect(metadata.files.length).to.be.greaterThan(0);

    // Verify menteeApplication.json - private fields redacted, allowed fields kept
    const appEntry = zip.getEntry("menteeApplication.json");
    const appData = JSON.parse(appEntry!.getData().toString("utf8"));
    // Private fields should be redacted
    expect(appData.field1).to.equal("【保护】");
    expect(appData.field2).to.equal("【保护】");
    // Allowed fields should be kept
    expect(appData["录取届"]).to.equal("2024");
    expect(appData["就读专业"]).to.equal("计算机科学");
    expect(appData["就读种类"]).to.equal("本科");
    expect(appData["预计毕业年份"]).to.equal("2028");
    expect(appData["大学一年级入学年份"]).to.equal("2024");

    // Verify menteeApplication.txt also has redaction
    const appTxtEntry = zip.getEntry("menteeApplication.txt");
    const appTxt = appTxtEntry!.getData().toString("utf8");
    expect(appTxt).to.include("【保护】");
    expect(appTxt).to.include("计算机科学");
    expect(appTxt).to.include("2024");

    // Verify interviewResults.json contains interview and feedback
    const interviewEntry = zip.getEntry("interviewResults.json");
    const interviews = JSON.parse(interviewEntry!.getData().toString("utf8"));
    expect(interviews).to.be.an("array");
    expect(interviews.length).to.equal(1);
    expect(interviews[0].type).to.equal("MenteeInterview");
    expect(interviews[0].decision.decision).to.equal("通过");
    expect(interviews[0].feedbacks).to.be.an("array");
    expect(interviews[0].feedbacks.length).to.equal(1);
    expect(interviews[0].feedbacks[0].interviewer.name).to.equal("测试面试官");
    expect(interviews[0].feedbacks[0].feedback.rating).to.equal(5);

    // Verify interviewResults.txt formatting
    const interviewTxt = zip
      .getEntry("interviewResults.txt")!
      .getData()
      .toString("utf8");
    expect(interviewTxt).to.include("测试面试官");
    expect(interviewTxt).to.include("rating: 5");
    // Verify multi-line comment formatting
    expect(interviewTxt).to.include("comment:");
    expect(interviewTxt).to.include("Line 1");
    expect(interviewTxt).to.include("Line 2");
    expect(interviewTxt).to.include("Line 3");
    // Verify dimensions formatting (without array indices)
    expect(interviewTxt).to.include("dimensions:");
    expect(interviewTxt).to.include("name: 能力");
    expect(interviewTxt).to.include("score: 5");

    // Verify internalNotes.json chronological order
    const notesEntry = zip.getEntry("internalNotes.json");
    const notes = JSON.parse(notesEntry!.getData().toString("utf8"));
    expect(notes).to.be.an("array");
    expect(notes.length).to.equal(2);
    expect(notes[0].markdown).to.equal("First note"); // Oldest first
    expect(notes[1].markdown).to.equal("Second note");

    // Verify internalNotes.txt
    const notesTxt = zip
      .getEntry("internalNotes.txt")!
      .getData()
      .toString("utf8");
    expect(notesTxt).to.include("First note");
    expect(notesTxt).to.include("Second note");

    // Verify mentorships.json chronological order
    const mentorshipsEntry = zip.getEntry("mentorships.json");
    const transcriptSummaries = JSON.parse(
      mentorshipsEntry!.getData().toString("utf8"),
    );
    expect(transcriptSummaries).to.be.an("array");
    // Filter for our test mentor
    const testSummaries = transcriptSummaries.filter(
      (s: any) => s.mentor.name === "测试导师",
    );
    expect(testSummaries.length).to.equal(2);
    // Verify chronological order (oldest first)
    expect(testSummaries[0].summary).to.equal("First meeting summary");
    expect(testSummaries[1].summary).to.equal("Second meeting summary");

    // Verify mentorship txt file
    const mentorshipTxtFile = fileNames.find((name) =>
      name.startsWith("mentorship_"),
    );
    expect(mentorshipTxtFile).to.be.a("string");
    const mentorshipTxt = zip
      .getEntry(mentorshipTxtFile!)!
      .getData()
      .toString("utf8");
    expect(mentorshipTxt).to.include("测试导师");
    expect(mentorshipTxt).to.include("First meeting summary");
    expect(mentorshipTxt).to.include("Second meeting summary");
  });
});
