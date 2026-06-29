import { expect } from "chai";
import sinon from "sinon";
import https from "https";
import EventEmitter from "events";
import {
  getTmUserIds,
  createRecurringMeeting,
  updateMeeting,
  getMeeting,
  listRecords,
  getKey2FileAddresses,
  getSpeakerStats,
} from "./TencentMeeting";
import MeetingSlot from "./database/models/MeetingSlot";

describe("TencentMeeting", () => {
  let requestStub: sinon.SinonStub;

  beforeEach(() => {
    // Reset env vars before each test
    process.env.TM_SECRET_ID = "test-secret-id";
    process.env.TM_SECRET_KEY = "test-secret-key";
    process.env.TM_ENTERPRISE_ID = "test-enterprise-id";
    process.env.TM_APP_ID = "test-app-id";

    // Stub https.request
    requestStub = sinon.stub(https, "request");
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("tmRequest (Internal)", () => {
    it("should handle request errors", async () => {
      const mockReq = new EventEmitter() as any;
      mockReq.write = sinon.stub();
      mockReq.end = sinon.stub();

      requestStub.callsFake(() => {
        // We simulate that `req.end()` has been called, and the request fails.
        // The error will be emitted on `mockReq`.
        setTimeout(() => mockReq.emit("error", new Error("Network Error")), 0);
        return mockReq;
      });

      let errorThrown = false;
      try {
        await getMeeting("test-meeting-id", "test-user");
      } catch (e: any) {
        errorThrown = true;
        expect(e.message).to.equal("Network Error");
      }
      expect(errorThrown).to.equal(true);
    });
  });

  describe("getTmUserIds", () => {
    it("should return parsed user ids from MeetingSlot", async () => {
      sinon
        .stub(MeetingSlot, "findAll")
        .resolves([{ tmUserId: "user1" } as any, { tmUserId: "user2" } as any]);
      const userIds = await getTmUserIds();
      expect(userIds).to.deep.equal(["user1", "user2"]);
    });

    it("should return empty array if no MeetingSlots are found", async () => {
      sinon.stub(MeetingSlot, "findAll").resolves([]);
      expect(await getTmUserIds()).to.deep.equal([]);
    });
  });

  describe("createRecurringMeeting", () => {
    it("should call tmRequest and parse the successful response", async () => {
      const fakeResponseData = {
        meeting_info_list: [
          {
            meeting_id: "test-meeting-id",
            join_url: "https://meeting.tencent.com/p/123",
          },
        ],
      };

      const mockReq = new EventEmitter() as any;
      mockReq.write = sinon.stub();
      mockReq.end = sinon.stub();

      const mockRes = new EventEmitter() as any;
      requestStub.callsFake((options, callback) => {
        callback(mockRes);
        mockRes.emit("data", JSON.stringify(fakeResponseData));
        mockRes.emit("end");
        return mockReq;
      });

      const result = await createRecurringMeeting(
        "test-user",
        "Test Subject",
        1600000000,
        1600003600,
      );

      expect(result.meeting_info_list).to.have.lengthOf(1);
      expect(result.meeting_info_list[0].meeting_id).to.equal(
        "test-meeting-id",
      );
      expect(result.meeting_info_list[0].join_url).to.equal(
        "https://meeting.tencent.com/p/123",
      );

      expect(requestStub.calledOnce).to.equal(true);
    });
  });

  describe("updateMeeting", () => {
    it("should call tmRequest with correct PUT method and payload", async () => {
      const mockReq = new EventEmitter() as any;
      mockReq.write = sinon.stub();
      mockReq.end = sinon.stub();

      const mockRes = new EventEmitter() as any;
      requestStub.callsFake((options, callback) => {
        expect(options.method).to.equal("PUT");
        expect(options.path).to.equal("/v1/meetings/test-meeting-id");
        callback(mockRes);
        mockRes.emit("data", JSON.stringify({}));
        mockRes.emit("end");
        return mockReq;
      });

      await updateMeeting("test-meeting-id", "test-user", "Updated Subject");

      expect(requestStub.calledOnce).to.equal(true);
    });
  });

  describe("getMeeting", () => {
    it("should call tmRequest and return meeting info", async () => {
      const fakeResponseData = {
        meeting_info_list: [
          {
            subject: "Test Meeting",
            meeting_id: "test-meeting-id",
            meeting_code: "123456",
            status: "1",
            join_url: "https://meeting.tencent.com/p/123",
            start_time: "1600000000",
            end_time: "1600003600",
          },
        ],
      };

      const mockReq = new EventEmitter() as any;
      mockReq.write = sinon.stub();
      mockReq.end = sinon.stub();

      const mockRes = new EventEmitter() as any;
      requestStub.callsFake((options, callback) => {
        callback(mockRes);
        mockRes.emit("data", JSON.stringify(fakeResponseData));
        mockRes.emit("end");
        return mockReq;
      });

      const result = await getMeeting("test-meeting-id", "test-user");

      expect(result.subject).to.equal("Test Meeting");
      expect(result.meeting_id).to.equal("test-meeting-id");
      expect(result.join_url).to.equal("https://meeting.tencent.com/p/123");

      expect(requestStub.calledOnce).to.equal(true);
    });

    it("should throw internal server error if error_info is returned", async () => {
      const fakeResponseData = {
        error_info: {
          message: "some error message",
          error_code: 1001,
          new_error_code: 1002,
        },
      };

      const mockReq = new EventEmitter() as any;
      mockReq.write = sinon.stub();
      mockReq.end = sinon.stub();

      const mockRes = new EventEmitter() as any;
      requestStub.callsFake((options, callback) => {
        callback(mockRes);
        mockRes.emit("data", JSON.stringify(fakeResponseData));
        mockRes.emit("end");
        return mockReq;
      });

      let errorThrown = false;
      try {
        await getMeeting("test-meeting-id", "test-user");
      } catch (e: any) {
        errorThrown = true;
        expect(e.message).to.include("some error message");
        expect(e.message).to.include("1002");
        expect(e.message).to.include("1001");
      }
      expect(errorThrown).to.equal(true);
    });
  });

  describe("listRecords", () => {
    it("should handle pagination and return records", async () => {
      const page1Data = {
        total_count: 3,
        total_page: 2,
        record_meetings: [
          { meeting_id: "m1", meeting_record_id: "r1", state: 3 },
        ],
      };
      const page2Data = {
        total_count: 3,
        total_page: 2,
        record_meetings: [
          { meeting_id: "m2", meeting_record_id: "r2", state: 3 },
          { meeting_id: "m3", meeting_record_id: "r3", state: 3 },
        ],
      };

      const mockReq = new EventEmitter() as any;
      mockReq.write = sinon.stub();
      mockReq.end = sinon.stub();

      let callCount = 0;
      requestStub.callsFake((options, callback) => {
        callCount++;
        const mockRes = new EventEmitter() as any;
        callback(mockRes);

        if (callCount === 1) {
          mockRes.emit("data", JSON.stringify(page1Data));
        } else {
          mockRes.emit("data", JSON.stringify(page2Data));
        }

        mockRes.emit("end");
        return mockReq;
      });

      const result = await listRecords("test-user");

      expect(result).to.have.lengthOf(3);
      expect(result[0].meeting_id).to.equal("m1");
      expect(result[2].meeting_id).to.equal("m3");
      expect(requestStub.calledTwice).to.equal(true);
    });
  });

  describe("getKey2FileAddresses", () => {
    it("should return parsed file addresses", async () => {
      const fakeResponseData = {
        ai_minutes: [
          { download_address: "https://example.com/file1", file_type: "pdf" },
        ],
        meeting_summary: [
          { download_address: "https://example.com/file2", file_type: "txt" },
        ],
      };

      const mockReq = new EventEmitter() as any;
      mockReq.write = sinon.stub();
      mockReq.end = sinon.stub();

      const mockRes = new EventEmitter() as any;
      requestStub.callsFake((options, callback) => {
        expect(options.path).to.equal(
          "/v1/addresses/record-123?userid=test-user",
        );
        callback(mockRes);
        mockRes.emit("data", JSON.stringify(fakeResponseData));
        mockRes.emit("end");
        return mockReq;
      });

      const result = await getKey2FileAddresses("record-123", "test-user");

      expect(result.ai_minutes).to.have.lengthOf(1);
      expect(result.ai_minutes![0].download_address).to.equal(
        "https://example.com/file1",
      );
      expect(result.meeting_summary).to.have.lengthOf(1);
      expect(requestStub.calledOnce).to.equal(true);
    });
  });

  describe("getSpeakerStats", () => {
    it("should return decoded speaker names and times in minutes", async () => {
      const fakeResponseData = {
        speaker_list: [
          {
            // Base64 for "Alice"
            speaker_name: Buffer.from("Alice").toString("base64"),
            total_time: 120000, // 2 minutes
          },
          {
            // Base64 for "Bob"
            speaker_name: Buffer.from("Bob").toString("base64"),
            total_time: 60000, // 1 minute
          },
        ],
      };

      const mockReq = new EventEmitter() as any;
      mockReq.write = sinon.stub();
      mockReq.end = sinon.stub();

      const mockRes = new EventEmitter() as any;
      requestStub.callsFake((options, callback) => {
        callback(mockRes);
        mockRes.emit("data", JSON.stringify(fakeResponseData));
        mockRes.emit("end");
        return mockReq;
      });

      const result = await getSpeakerStats("record-123", "test-user");

      expect(result).to.have.lengthOf(2);
      expect(result[0].speakerName).to.equal("Alice");
      expect(result[0].totalTime).to.equal(2);
      expect(result[1].speakerName).to.equal("Bob");
      expect(result[1].totalTime).to.equal(1);

      expect(requestStub.calledOnce).to.equal(true);
    });
  });
});
