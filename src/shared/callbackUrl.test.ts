import { expect } from "chai";
import { getSafeCallbackUrl } from "./callbackUrl";

describe("getSafeCallbackUrl", () => {
  it("should return '/' for empty input", () => {
    expect(getSafeCallbackUrl(null)).to.equal("/");
    expect(getSafeCallbackUrl(undefined)).to.equal("/");
    expect(getSafeCallbackUrl("")).to.equal("/");
  });

  it("should allow safe relative paths", () => {
    expect(getSafeCallbackUrl("/")).to.equal("/");
    expect(getSafeCallbackUrl("/dashboard")).to.equal("/dashboard");
    expect(getSafeCallbackUrl("/profile?id=123")).to.equal("/profile?id=123");
  });

  it("should reject absolute URLs", () => {
    expect(getSafeCallbackUrl("http://evil.com")).to.equal("/");
    expect(getSafeCallbackUrl("https://evil.com")).to.equal("/");
  });

  it("should reject protocol-relative URLs", () => {
    expect(getSafeCallbackUrl("//evil.com")).to.equal("/");
  });

  it("should reject URLs with backslash after slash", () => {
    expect(getSafeCallbackUrl("/\\evil.com")).to.equal("/");
  });

  it("should reject javascript protocol", () => {
    expect(getSafeCallbackUrl("javascript:alert(1)")).to.equal("/");
  });

  it("should reject other non-relative paths", () => {
    expect(getSafeCallbackUrl("foo/bar")).to.equal("/");
  });
});
