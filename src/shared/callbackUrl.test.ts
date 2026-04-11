import { expect } from "chai";
import { getSafeCallbackUrl } from "./callbackUrl";

describe("getSafeCallbackUrl", () => {
  it("should return the URL if it is a safe relative path", () => {
    expect(getSafeCallbackUrl("/")).to.equal("/");
    expect(getSafeCallbackUrl("/home")).to.equal("/home");
    expect(getSafeCallbackUrl("/path/to/page?query=1")).to.equal(
      "/path/to/page?query=1",
    );
  });

  it("should return '/' if the URL is null, undefined, or empty", () => {
    expect(getSafeCallbackUrl(null)).to.equal("/");
    expect(getSafeCallbackUrl(undefined)).to.equal("/");
    expect(getSafeCallbackUrl("")).to.equal("/");
  });

  it("should return '/' if the URL is an absolute URL", () => {
    expect(getSafeCallbackUrl("https://example.com")).to.equal("/");
    expect(getSafeCallbackUrl("http://localhost:3000")).to.equal("/");
    expect(getSafeCallbackUrl("ftp://files.com")).to.equal("/");
  });

  it("should return '/' if the URL starts with '//' or '/\\'", () => {
    expect(getSafeCallbackUrl("//evil.com")).to.equal("/");
    expect(getSafeCallbackUrl("/\\evil.com")).to.equal("/");
  });

  it("should return '/' if the URL is a javascript: URL", () => {
    expect(getSafeCallbackUrl("javascript:alert(1)")).to.equal("/");
  });
});
