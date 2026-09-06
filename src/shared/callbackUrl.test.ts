import { expect } from "chai";
import { isSafeCallbackUrl, sanitizeCallbackUrl } from "./callbackUrl";

describe("isSafeCallbackUrl", () => {
  it("should return true if it is a safe relative path", () => {
    void expect(isSafeCallbackUrl("/")).to.be.true;
    void expect(isSafeCallbackUrl("/home")).to.be.true;
    void expect(isSafeCallbackUrl("/path/to/page?query=1")).to.be.true;
  });

  it("should return false if the URL is null, undefined, or empty", () => {
    void expect(isSafeCallbackUrl(null)).to.be.false;
    void expect(isSafeCallbackUrl(undefined)).to.be.false;
    void expect(isSafeCallbackUrl("")).to.be.false;
  });

  it("should return false if the URL is an absolute URL", () => {
    void expect(isSafeCallbackUrl("https://example.com")).to.be.false;
    void expect(isSafeCallbackUrl("http://localhost:3000")).to.be.false;
    void expect(isSafeCallbackUrl("ftp://files.com")).to.be.false;
  });

  it("should return false if the URL starts with '//' or '/\\'", () => {
    void expect(isSafeCallbackUrl("//evil.com")).to.be.false;
    void expect(isSafeCallbackUrl("/\\evil.com")).to.be.false;
  });

  it("should return false if the URL is a javascript: URL", () => {
    void expect(isSafeCallbackUrl("javascript:alert(1)")).to.be.false;
  });
});

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
