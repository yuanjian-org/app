import { expect } from "chai";
import sinon from "sinon";
import axios from "axios";
import {
  getTmUserIds,
  createRecurringMeeting,
  getMeeting,
} from "./TencentMeeting";
import MeetingSlot from "./database/models/MeetingSlot";

describe("TencentMeeting", () => {
  let axiosRequestStub: sinon.SinonStub;

  beforeEach(() => {
    // Reset env vars before each test
    process.env.TM_SECRET_ID = "test-secret-id";
    process.env.TM_SECRET_KEY = "test-secret-key";
    process.env.TM_ENTERPRISE_ID = "test-enterprise-id";
    process.env.TM_APP_ID = "test-app-id";

    // Stub axios.request
    axiosRequestStub = sinon.stub(axios, "request");
  });

  afterEach(() => {
    sinon.restore();
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

      axiosRequestStub.resolves({ data: fakeResponseData });

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

      expect(axiosRequestStub.calledOnce).to.equal(true);
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

      axiosRequestStub.resolves({ data: fakeResponseData });

      const result = await getMeeting("test-meeting-id", "test-user");

      expect(result.subject).to.equal("Test Meeting");
      expect(result.meeting_id).to.equal("test-meeting-id");
      expect(result.join_url).to.equal("https://meeting.tencent.com/p/123");

      expect(axiosRequestStub.calledOnce).to.equal(true);
    });

    it("should throw internal server error if error_info is returned", async () => {
      const fakeResponseData = {
        error_info: {
          message: "some error message",
          error_code: 1001,
          new_error_code: 1002,
        },
      };

      axiosRequestStub.resolves({ data: fakeResponseData });

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
