import { expect } from "chai";
import { sanitizeCallbackUrl } from "./callbackUrl";

describe("sanitizeCallbackUrl", () => {
  it("should return the URL if it is a safe relative path", () => {
    expect(sanitizeCallbackUrl("/")).to.equal("/");
    expect(sanitizeCallbackUrl("/home")).to.equal("/home");
    expect(sanitizeCallbackUrl("/path/to/page?query=1")).to.equal(
      "/path/to/page?query=1",
    );
  });

  it("should return '/' if the URL is null, undefined, or empty", () => {
    expect(sanitizeCallbackUrl(null)).to.equal("/");
    expect(sanitizeCallbackUrl(undefined)).to.equal("/");
    expect(sanitizeCallbackUrl("")).to.equal("/");
  });

  it("should return '/' if the URL is an absolute URL", () => {
    expect(sanitizeCallbackUrl("https://example.com")).to.equal("/");
    expect(sanitizeCallbackUrl("http://localhost:3000")).to.equal("/");
    expect(sanitizeCallbackUrl("ftp://files.com")).to.equal("/");
  });

  it("should return '/' if the URL starts with '//' or '/\\'", () => {
    expect(sanitizeCallbackUrl("//evil.com")).to.equal("/");
    expect(sanitizeCallbackUrl("/\\evil.com")).to.equal("/");
  });

  it("should return '/' if the URL is a javascript: URL", () => {
    expect(sanitizeCallbackUrl("javascript:alert(1)")).to.equal("/");
  });
});
