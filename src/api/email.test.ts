import { expect } from "chai";
import sinon from "sinon";
import axios from "axios";
import { email } from "./email";
import { TRPCError } from "@trpc/server";

describe("email", () => {
  let axiosPostStub: sinon.SinonStub;
  let originalEnv: NodeJS.ProcessEnv;
  let originalIt: typeof global.it;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.AOKSEND_APP_KEY = "test_app_key";
    axiosPostStub = sinon.stub(axios, "post");

    // Bypass the global.it check inside email()
    originalIt = global.it;
    Reflect.set(global, "it", undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
    sinon.restore();
    global.it = originalIt;
  });

  it("should batch emails via AoKSend and sanitize emojis", async () => {
    axiosPostStub.resolves({
      data: { code: 200, message: "OK" },
    });

    const toEmails = ["test1@example.com", "test2@example.com"];
    const templateId = "E_12345";
    const templateData = {
      name: "John 😊",
      message: "Hello world!",
    };
    const baseUrl = "https://example.com";

    await email(toEmails, templateId, templateData, baseUrl);

    // A single batch request should be made for all email addresses
    expect(axiosPostStub.callCount).to.equal(1);

    // Verify batch call arguments
    const callArgs = axiosPostStub.getCall(0).args;
    expect(callArgs[0]).to.equal(
      "https://www.aoksend.com/index/api/send_email_batch",
    );

    const formData: FormData = callArgs[1];
    expect(formData.get("app_key")).to.equal("test_app_key");
    expect(formData.get("template_id")).to.equal("E_12345");
    expect(formData.getAll("to[]")).to.deep.equal(toEmails);

    const dataAll = formData.getAll("data[]");
    expect(dataAll).to.have.length(1);
    const data = JSON.parse(dataAll[0] as string);
    expect(data).to.deep.equal({
      baseUrl: "https://example.com",
      name: "John [表情符]", // Emojis should be sanitized
      message: "Hello world!",
    });

    // Verify headers
    expect(callArgs[2]).to.deep.equal({
      headers: { "Content-Type": "multipart/form-data" },
    });
  });

  it("should skip API call if recipient list is empty", async () => {
    await email([], "E_12345", {}, "https://example.com");

    expect(axiosPostStub.callCount).to.equal(0);
  });

  it("should skip actual API call if AOKSEND_APP_KEY is not configured", async () => {
    delete process.env.AOKSEND_APP_KEY;

    await email(["test@example.com"], "E_12345", {}, "https://example.com");

    expect(axiosPostStub.callCount).to.equal(0);
  });

  it("should throw internal server error if AoKSend returns non-200 code", async () => {
    axiosPostStub.resolves({
      data: { code: 500, message: "Internal Error" },
    });

    let error: TRPCError | undefined;
    try {
      await email(["test@example.com"], "E_12345", {}, "https://example.com");
    } catch (e: unknown) {
      error = e as TRPCError;
    }

    expect(error).to.not.equal(undefined);
    expect(error?.code).to.equal("INTERNAL_SERVER_ERROR");
    expect(error?.message).to.equal("邮件发送失败：500｜Internal Error");
  });
});
