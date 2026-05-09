import { expect } from "chai";
import sinon from "sinon";
import axios from "axios";
import { sms, idTokenInternationalSmsTemplateId } from "./sms";

describe("sms", () => {
  let axiosPostStub: sinon.SinonStub;
  let originalIt: typeof global.it;
  let envCache: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Cache environment variables
    envCache = { ...process.env };

    // Set mock environment variables
    process.env.SUBMAIL_DOMESTIC_APP_ID = "domestic_id";
    process.env.SUBMAIL_DOMESTIC_APP_KEY = "domestic_key";
    process.env.SUBMAIL_INTERNATIONAL_APP_ID = "intl_id";
    process.env.SUBMAIL_INTERNATIONAL_APP_KEY = "intl_key";

    // Stub axios.post
    axiosPostStub = sinon.stub(axios, "post").resolves({
      status: 200,
      data: { status: "success" },
    });

    // Unset global.it to bypass the test execution check in sms.ts
    originalIt = global.it;
    global.it = undefined as any;
  });

  afterEach(() => {
    // Restore global.it
    global.it = originalIt;

    // Restore environment variables
    process.env = envCache;

    sinon.restore();
  });

  it("should return early if Submail credentials are not configured", async () => {
    delete process.env.SUBMAIL_DOMESTIC_APP_KEY;
    delete process.env.SUBMAIL_INTERNATIONAL_APP_KEY;

    await sms("dom_tmpl", "intl_tmpl", [
      { to: "+8615000000000", vars: { name: "test" } },
      { to: "+15000000000", vars: { name: "test" } },
    ]);

    expect(axiosPostStub.callCount).to.equal(0);
  });

  it("should send domestic SMS via multixsend endpoint", async () => {
    await sms("dom_tmpl", "intl_tmpl", [
      { to: "+8615000000000", vars: { name: "test1" } },
      { to: "+8615000000001", vars: { name: "test2" } },
    ]);

    expect(axiosPostStub.callCount).to.equal(1);
    const [url, form] = axiosPostStub.firstCall.args;
    expect(url).to.equal("https://api-v4.mysubmail.com/sms/multixsend");
    expect(form).to.be.instanceOf(FormData);
    expect(form.get("appid")).to.equal("domestic_id");
    expect(form.get("signature")).to.equal("domestic_key");
    expect(form.get("project")).to.equal("dom_tmpl");
    expect(form.get("multi")).to.equal(
      JSON.stringify([
        { to: "15000000000", vars: { name: "test1" } },
        { to: "15000000001", vars: { name: "test2" } },
      ]),
    );
  });

  it("should send international SMS via internationalsms/multixsend endpoint", async () => {
    await sms("dom_tmpl", "intl_tmpl", [
      { to: "+12000000000", vars: { name: "test_intl" } },
    ]);

    expect(axiosPostStub.callCount).to.equal(1);
    const [url, form] = axiosPostStub.firstCall.args;
    expect(url).to.equal(
      "https://api-v4.mysubmail.com/internationalsms/multixsend",
    );
    expect(form).to.be.instanceOf(FormData);
    expect(form.get("appid")).to.equal("intl_id");
    expect(form.get("signature")).to.equal("intl_key");
    expect(form.get("project")).to.equal("intl_tmpl");
    expect(form.get("multi")).to.equal(
      JSON.stringify([{ to: "+12000000000", vars: { name: "test_intl" } }]),
    );
  });

  it("should send both domestic and international SMS if both types are provided", async () => {
    await sms("dom_tmpl", "intl_tmpl", [
      { to: "+8615000000000", vars: { name: "dom" } },
      { to: "+447000000000", vars: { name: "intl" } },
    ]);

    expect(axiosPostStub.callCount).to.equal(2);
    expect(axiosPostStub.firstCall.args[0]).to.equal(
      "https://api-v4.mysubmail.com/sms/multixsend",
    );
    expect(axiosPostStub.secondCall.args[0]).to.equal(
      "https://api-v4.mysubmail.com/internationalsms/multixsend",
    );
  });

  it("should throw INTERNAL_SERVER_ERROR if domestic SMS returns non-200 status", async () => {
    axiosPostStub.resolves({ status: 500, data: {} });

    let error: any;
    try {
      await sms("dom_tmpl", "intl_tmpl", [
        { to: "+8615000000000", vars: { name: "dom" } },
      ]);
    } catch (e) {
      error = e;
    }

    expect(error).to.not.equal(undefined);
    expect(error.code).to.equal("INTERNAL_SERVER_ERROR");
  });

  it("should throw INTERNAL_SERVER_ERROR if domestic SMS returns status other than success", async () => {
    axiosPostStub.resolves({
      status: 200,
      data: { status: "error", msg: "some error" },
    });

    let error: any;
    try {
      await sms("dom_tmpl", "intl_tmpl", [
        { to: "+8615000000000", vars: { name: "dom" } },
      ]);
    } catch (e) {
      error = e;
    }

    expect(error).to.not.equal(undefined);
    expect(error.code).to.equal("INTERNAL_SERVER_ERROR");
  });

  it("should ignore errors for international SMS if template is not for idToken", async () => {
    axiosPostStub.resolves({ status: 500, data: { status: "error" } });

    await sms("dom_tmpl", "some_other_tmpl", [
      { to: "+12000000000", vars: { name: "intl" } },
    ]);

    // Should not throw
    expect(axiosPostStub.callCount).to.equal(1);
  });

  it("should throw INTERNAL_SERVER_ERROR for international SMS if template is for idToken", async () => {
    axiosPostStub.resolves({ status: 200, data: { status: "error" } });

    let error: any;
    try {
      await sms("dom_tmpl", idTokenInternationalSmsTemplateId, [
        { to: "+12000000000", vars: { name: "intl" } },
      ]);
    } catch (e) {
      error = e;
    }

    expect(error).to.not.equal(undefined);
    expect(error.code).to.equal("INTERNAL_SERVER_ERROR");
  });
});
