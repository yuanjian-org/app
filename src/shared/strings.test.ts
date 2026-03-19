import { expect } from "chai";
import { isValidEmail, isValidPassword } from "./strings";

describe("strings", () => {
  describe("isValidEmail", () => {
    it("should return true for valid standard emails", () => {
      const validEmails = [
        "test@example.com",
        "user.name@domain.co.uk",
        "user_name@domain.com",
        "user-name@domain.com",
        "user+tag@example.com",
        "123@123.com",
        "a@b.cd",
      ];

      for (const email of validEmails) {
        void expect(
          isValidEmail(email),
          `Expected ${email} to be a valid email`,
        ).to.be.true;
      }
    });

    it("should return false for invalid emails missing parts", () => {
      const invalidEmails = [
        "test@.com",
        "@example.com",
        "test@example.",
        "test@example",
        "test.com",
      ];

      for (const email of invalidEmails) {
        void expect(
          isValidEmail(email),
          `Expected ${email} to be an invalid email`,
        ).to.be.false;
      }
    });

    it("should return false for emails with spaces", () => {
      const invalidEmails = [
        "test @example.com",
        "test@ example.com",
        "test@example. com",
        " test@example.com",
        "test@example.com ",
      ];

      for (const email of invalidEmails) {
        void expect(
          isValidEmail(email),
          `Expected ${email} to be an invalid email`,
        ).to.be.false;
      }
    });

    it("should return false for missing @ or domain parts", () => {
      const invalidEmails = ["testexample.com", "test@", "@", "", " "];

      for (const email of invalidEmails) {
        void expect(
          isValidEmail(email),
          `Expected ${email} to be an invalid email`,
        ).to.be.false;
      }
    });
  });

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
