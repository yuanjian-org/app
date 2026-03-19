import { expect } from "chai";
import moment from "moment";
import { isEnded } from "./Mentorship";
import { DateColumn } from "./DateColumn";

describe("Mentorship", () => {
  describe("isEnded", () => {
    it("should return false if endsAt is null", () => {
      void expect(isEnded(null)).to.be.false;
    });

    it("should return false if endsAt is in the future (Date)", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      void expect(isEnded(futureDate.toISOString() as DateColumn)).to.be.false;
    });

    it("should return true if endsAt is in the past (Date)", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      void expect(isEnded(pastDate.toISOString() as DateColumn)).to.be.true;
    });

    it("should return false if endsAt is in the future (moment string)", () => {
      const futureDate = moment().add(1, "days").toISOString();
      void expect(isEnded(futureDate as DateColumn)).to.be.false;
    });

    it("should return true if endsAt is in the past (moment string)", () => {
      const pastDate = moment().subtract(1, "days").toISOString();
      void expect(isEnded(pastDate as DateColumn)).to.be.true;
    });

    it("should handle current date edge case", () => {
      const now = new Date();
      void expect(isEnded(now.toISOString() as DateColumn)).to.be.false;
    });
  });
});
