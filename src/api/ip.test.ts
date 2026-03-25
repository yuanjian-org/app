import { expect } from "chai";
import sinon from "sinon";
import { ip } from "./ip";

describe("ip() middleware", () => {
  let envProxySettings: string | undefined;

  beforeEach(() => {
    envProxySettings = process.env.TRUSTED_PROXIES;
  });

  afterEach(() => {
    if (envProxySettings === undefined) {
      delete process.env.TRUSTED_PROXIES;
    } else {
      process.env.TRUSTED_PROXIES = envProxySettings;
    }
    sinon.restore();
  });

  it("should return a tRPC middleware with the expected internal structure", () => {
    process.env.TRUSTED_PROXIES = "loopback";
    const mw = ip();

    // The middleware is an object that contains _middlewares array
    expect(mw).to.have.property("_middlewares");
    expect((mw as any)._middlewares).to.be.an("array");
    expect((mw as any)._middlewares.length).to.be.greaterThan(0);
  });

  it("should successfully invoke the internal middleware function setting the correct IP", async () => {
    process.env.TRUSTED_PROXIES = "loopback";
    const mw = ip();
    const mwFunc = (mw as any)._middlewares[0];

    const next = sinon.stub().resolves({ ok: true });
    const ctx = {
      req: {
        headers: { "x-forwarded-for": "203.0.113.195, 127.0.0.1" },
        connection: { remoteAddress: "127.0.0.1" },
      },
    };

    await mwFunc({ ctx, next } as any);

    void expect(next.calledOnce).to.be.true;
    expect(next.firstCall.args[0].ctx.ip).to.equal("203.0.113.195");
  });

  it("should successfully invoke the internal middleware function rejecting untrusted proxy", async () => {
    process.env.TRUSTED_PROXIES = "loopback";
    const mw = ip();
    const mwFunc = (mw as any)._middlewares[0];

    const next = sinon.stub().resolves({ ok: true });
    const ctx = {
      req: {
        headers: { "x-forwarded-for": "203.0.113.195, 10.0.0.5" },
        connection: { remoteAddress: "10.0.0.5" },
      },
    };

    await mwFunc({ ctx, next } as any);

    void expect(next.calledOnce).to.be.true;
    // 10.0.0.5 is not trusted, so proxy-addr rejects the header and fallback
    // kicks in
    expect(next.firstCall.args[0].ctx.ip).to.equal("10.0.0.5");
  });
});
