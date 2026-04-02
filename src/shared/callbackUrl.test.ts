import { expect } from "chai";
import { getSafeCallbackUrl } from "./callbackUrl";

describe("getSafeCallbackUrl", () => {
  it("should return '/' for null or undefined", () => {
    void expect(getSafeCallbackUrl(null)).to.equal("/");
    void expect(getSafeCallbackUrl(undefined)).to.equal("/");
  });

  it("should return '/' for empty string", () => {
    void expect(getSafeCallbackUrl("")).to.equal("/");
  });

  it("should allow safe relative paths", () => {
    void expect(getSafeCallbackUrl("/dashboard")).to.equal("/dashboard");
    void expect(getSafeCallbackUrl("/profile?edit=true")).to.equal(
      "/profile?edit=true",
    );
  });

  it("should reject absolute URLs", () => {
    void expect(getSafeCallbackUrl("https://evil.com")).to.equal("/");
    void expect(getSafeCallbackUrl("http://evil.com")).to.equal("/");
  });

  it("should reject protocol-relative URLs", () => {
    void expect(getSafeCallbackUrl("//evil.com")).to.equal("/");
    void expect(getSafeCallbackUrl("/\\evil.com")).to.equal("/");
  });

  it("should reject dangerous protocols", () => {
    void expect(getSafeCallbackUrl("javascript:alert(1)")).to.equal("/");
    void expect(getSafeCallbackUrl("data:text/html,evil")).to.equal("/");
  });

  it("should reject paths not starting with /", () => {
    void expect(getSafeCallbackUrl("dashboard")).to.equal("/");
  });
});
