import { expect } from "chai";
import { diffInMinutes } from "./diffInMinutes";
import { DateColumn } from "../DateColumn";

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
