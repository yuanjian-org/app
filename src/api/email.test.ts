import { expect } from "chai";
import sinon from "sinon";
import axios from "axios";
import { email } from "./email";
import { TRPCError } from "@trpc/server";

describe("email", () => {
  let axiosPostStub: sinon.SinonStub;
  let originalEnv: NodeJS.ProcessEnv;
  let originalIt: any;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.AOKSEND_APP_KEY = "test_app_key";
    axiosPostStub = sinon.stub(axios, "post");

    // Bypass the global.it check inside emailOne
    originalIt = global.it;
    global.it = undefined as any;
  });

  afterEach(() => {
    process.env = originalEnv;
    sinon.restore();
    global.it = originalIt;
  });

  it("should send emails correctly via AoKSend and sanitize emojis", async () => {
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

    // emailOne should be called once for each email address
    expect(axiosPostStub.callCount).to.equal(2);

    // Verify first call
    const firstCallArgs = axiosPostStub.getCall(0).args;
    expect(firstCallArgs[0]).to.equal(
      "https://www.aoksend.com/index/api/send_email_batch",
    );

    const formData1: FormData = firstCallArgs[1];
    expect(formData1.get("app_key")).to.equal("test_app_key");
    expect(formData1.get("template_id")).to.equal("E_12345");
    expect(formData1.get("to")).to.equal("test1@example.com");

    const data1 = JSON.parse(formData1.get("data") as string);
    expect(data1).to.deep.equal({
      baseUrl: "https://example.com",
      name: "John [表情符]", // Emjois should be sanitized
      message: "Hello world!",
    });

    // Verify headers
    expect(firstCallArgs[2]).to.deep.equal({
      headers: { "Content-Type": "multipart/form-data" },
    });
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
    } catch (e: any) {
      error = e;
    }

    expect(error).to.not.equal(undefined);
    expect(error?.code).to.equal("INTERNAL_SERVER_ERROR");
    expect(error?.message).to.equal("邮件发送失败：500｜Internal Error");
  });
});
