import { expect } from "chai";
import {
  diffInMinutes,
  isValidEmail,
  isValidPassword,
  isValidPhone,
  parseQueryString,
} from "./strings";
import { DateColumn } from "./DateColumn";
import { NextRouter } from "next/router";

describe("strings", () => {
  describe("diffInMinutes", () => {
    it("should calculate difference correctly with Date objects", () => {
      const from = new Date("2024-01-01T10:00:00Z");
      const to = new Date("2024-01-01T10:30:00Z");
      expect(diffInMinutes(from, to)).to.equal(30);
    });

    it("should calculate difference correctly with DateColumn strings", () => {
      const from: DateColumn = "2024-01-01T10:00:00Z";
      const to: DateColumn = "2024-01-01T11:15:00Z";
      expect(diffInMinutes(from, to)).to.equal(75);
    });

    it("should handle mixed Date and DateColumn inputs", () => {
      const from = new Date("2024-01-01T10:00:00Z");
      const to: DateColumn = "2024-01-01T10:45:00Z";
      expect(diffInMinutes(from, to)).to.equal(45);
    });

    it("should return negative values when 'to' is before 'from'", () => {
      const from = new Date("2024-01-01T10:30:00Z");
      const to = new Date("2024-01-01T10:00:00Z");
      expect(diffInMinutes(from, to)).to.equal(-30);
    });

    it("should return zero when 'from' and 'to' are exactly the same", () => {
      const date = new Date("2024-01-01T10:00:00Z");
      expect(diffInMinutes(date, date)).to.equal(0);
    });

    it("should round to the nearest minute", () => {
      // 30 seconds difference -> rounds to 1 minute
      const from1 = new Date("2024-01-01T10:00:00Z");
      const to1 = new Date("2024-01-01T10:00:30Z");
      expect(diffInMinutes(from1, to1)).to.equal(1);

      // 29 seconds difference -> rounds to 0 minutes
      const from2 = new Date("2024-01-01T10:00:00Z");
      const to2 = new Date("2024-01-01T10:00:29Z");
      expect(diffInMinutes(from2, to2)).to.equal(0);
    });

    it("should handle date boundaries correctly", () => {
      // Crosses midnight
      const from = new Date("2024-01-01T23:45:00Z");
      const to = new Date("2024-01-02T00:15:00Z");
      expect(diffInMinutes(from, to)).to.equal(30);
    });
  });

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

  describe("parseQueryString", () => {
    it("should return the string if the query parameter is a string", () => {
      const mockRouter = {
        query: {
          id: "123",
        },
      } as unknown as NextRouter;
      expect(parseQueryString(mockRouter, "id")).to.equal("123");
    });

    it("should return undefined if the query parameter is undefined", () => {
      const mockRouter = {
        query: {},
      } as unknown as NextRouter;
      expect(parseQueryString(mockRouter, "id")).to.equal(undefined);
    });

    it("should return undefined if the query parameter is an array of strings", () => {
      const mockRouter = {
        query: {
          id: ["123", "456"],
        },
      } as unknown as NextRouter;
      expect(parseQueryString(mockRouter, "id")).to.equal(undefined);
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

  describe("isValidPhone", () => {
    it("should return true for valid Chinese phone numbers starting with +86", () => {
      const validNumbers = [
        "+8613800138000",
        "+8619912345678",
        "+8615012345678",
      ];
      for (const number of validNumbers) {
        void expect(isValidPhone(number)).to.be.true;
      }
    });

    it("should return false for invalid Chinese phone numbers starting with +86", () => {
      const invalidNumbers = [
        "+8612800138000", // Second digit not 3-9
        "+861380013800", // Too short
        "+86138001380000", // Too long
        "+861380013800a", // Contains letter
        "+8623800138000", // Doesn't start with 1
      ];
      for (const number of invalidNumbers) {
        void expect(isValidPhone(number)).to.be.false;
      }
    });

    it("should return false for phone numbers that do not start with +", () => {
      const invalidNumbers = [
        "13800138000",
        "8613800138000",
        "008613800138000",
        "phone",
        "",
      ];
      for (const number of invalidNumbers) {
        void expect(isValidPhone(number)).to.be.false;
      }
    });

    it("should return true for international phone numbers starting with + and at least 8 characters long", () => {
      const validNumbers = [
        "+1234567", // 8 chars total including +
        "+14155552671",
        "+442071234567",
        "+919876543210",
      ];
      for (const number of validNumbers) {
        void expect(isValidPhone(number)).to.be.true;
      }
    });

    it("should return false for international phone numbers starting with + but less than 8 characters long", () => {
      const invalidNumbers = [
        "+",
        "+1",
        "+12",
        "+123456", // 7 chars total including +
      ];
      for (const number of invalidNumbers) {
        void expect(isValidPhone(number)).to.be.false;
      }
    });
  });
});
