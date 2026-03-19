import { expect } from "chai";
import { isValidPassword } from "./strings";

describe("strings", () => {
  describe("isValidPassword", () => {
    it("should return false for empty string", () => {
      void expect(isValidPassword("")).to.be.false;
    });

    it("should return false for passwords shorter than 8 characters", () => {
      void expect(isValidPassword("1234567")).to.be.false;
    });

    it("should return true for passwords with exactly 8 characters", () => {
      void expect(isValidPassword("12345678")).to.be.true;
    });

    it("should return true for passwords longer than 8 characters but less than 80", () => {
      void expect(isValidPassword("1234567890")).to.be.true;
    });

    it("should return false for passwords with exactly 80 characters", () => {
      const longPassword = "a".repeat(80);
      void expect(isValidPassword(longPassword)).to.be.false;
    });

    it("should return false for passwords longer than 80 characters", () => {
      const veryLongPassword = "a".repeat(81);
      void expect(isValidPassword(veryLongPassword)).to.be.false;
    });
  });
});
