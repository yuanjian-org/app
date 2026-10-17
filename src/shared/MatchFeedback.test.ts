import { expect } from "chai";
import { summarizeFeedbackItems } from "./MatchFeedback";

describe("summarizeFeedbackItems", () => {
  it("should return zeros for undefined input", () => {
    const summary = summarizeFeedbackItems(undefined);
    expect(summary).to.deep.equal({ total: 0, scores: 0, reasons: 0 });
  });

  it("should return zeros for empty array input", () => {
    const summary = summarizeFeedbackItems([]);
    expect(summary).to.deep.equal({ total: 0, scores: 0, reasons: 0 });
  });

  it("should correctly summarize mentee feedback items", () => {
    const items = [
      { id: "1", score: 4, reason: "Good" },
      { id: "2", score: 5 },
      { id: "3", reason: "Pending score" },
      { id: "4" },
    ];
    const summary = summarizeFeedbackItems(items);
    expect(summary).to.deep.equal({ total: 4, scores: 2, reasons: 2 });
  });

  it("should correctly summarize mentor feedback items", () => {
    const items = [
      { id: "1", choice: "Prefer", reason: "Good" },
      { id: "2", choice: "Neutral" },
      { id: "3", reason: "Pending choice" },
      { id: "4" },
    ];
    const summary = summarizeFeedbackItems(items);
    expect(summary).to.deep.equal({ total: 4, scores: 2, reasons: 2 });
  });
});
