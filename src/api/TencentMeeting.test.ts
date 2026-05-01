import { expect } from "chai";
import sinon from "sinon";
import https from "https";
import EventEmitter from "events";
import {
  getTmUserIds,
  createRecurringMeeting,
  getMeeting,
} from "./TencentMeeting";

describe("TencentMeeting", () => {
  let requestStub: sinon.SinonStub;

  beforeEach(() => {
    // Reset env vars before each test
    process.env.TM_USER_IDS = "user1,user2";
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

  describe("getTmUserIds", () => {
    it("should return parsed user ids from environment variable", () => {
      const userIds = getTmUserIds();
      expect(userIds).to.deep.equal(["user1", "user2"]);
    });

    it("should return empty array if no user ids are set", () => {
      process.env.TM_USER_IDS = "";
      expect(getTmUserIds()).to.deep.equal([]);
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
});
