import { expect } from "chai";
import { getSafeCallbackUrl } from "./callbackUrl";

describe("getSafeCallbackUrl", () => {
  it("should return '/' for undefined or empty input", () => {
    expect(getSafeCallbackUrl(undefined)).to.equal("/");
    expect(getSafeCallbackUrl("")).to.equal("/");
  });

  it("should return the input URL for safe local paths", () => {
    expect(getSafeCallbackUrl("/")).to.equal("/");
    expect(getSafeCallbackUrl("/dashboard")).to.equal("/dashboard");
    expect(getSafeCallbackUrl("/auth/login?foo=bar")).to.equal(
      "/auth/login?foo=bar",
    );
  });

  it("should return '/' for protocol-relative paths", () => {
    expect(getSafeCallbackUrl("//evil.com")).to.equal("/");
    expect(getSafeCallbackUrl("/\\evil.com")).to.equal("/");
  });

  it("should return '/' for absolute URLs", () => {
    expect(getSafeCallbackUrl("https://evil.com")).to.equal("/");
    expect(getSafeCallbackUrl("http://evil.com")).to.equal("/");
    expect(getSafeCallbackUrl("ftp://evil.com")).to.equal("/");
  });

  it("should return '/' for other dangerous schemes", () => {
    expect(getSafeCallbackUrl("javascript:alert(1)")).to.equal("/");
    expect(
      getSafeCallbackUrl("data:text/html,<script>alert(1)</script>"),
    ).to.equal("/");
  });
});
