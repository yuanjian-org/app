import { expect } from "chai";
import { isValidPhone } from "./isValidPhone";

describe("isValidPhone", () => {
  it("should return true for valid Chinese phone numbers starting with +86", () => {
    const validNumbers = ["+8613800138000", "+8619912345678", "+8615012345678"];
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
