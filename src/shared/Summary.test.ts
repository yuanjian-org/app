import { expect } from "chai";
import { computeDeletion, Summary } from "./Summary";

describe("Summary computeDeletion", () => {
  const createSummary = (
    markdown: string,
    initialLength: number = markdown.length,
    deletedLength: number = 0,
  ): Summary => ({
    transcriptId: "test-id",
    key: "test-key",
    markdown,
    initialLength,
    deletedLength,
  });

  it("should detect no deletions for identical strings", () => {
    const old = createSummary("This is a test summary");
    const result = computeDeletion(old, "This is a test summary");

    expect(result.deleted).to.deep.equal([]);
    expect(result.totalDeletedLength).to.equal(0);
    void expect(result.allowed).to.be.true;
  });

  it("should detect no deletions when only additions are made", () => {
    const old = createSummary("This is a test summary");
    const result = computeDeletion(
      old,
      "This is a test summary with more words",
    );

    expect(result.deleted).to.deep.equal([]);
    expect(result.totalDeletedLength).to.equal(0);
    void expect(result.allowed).to.be.true;
  });

  it("should detect deletions and allow if within maxDeletionRatio (<= 20%)", () => {
    // 20 characters length. 20% is 4 chars. Note: diffWords matches word boundaries and symbols.
    // So we use words to ensure diffWords works properly.
    // Let's use:
    // old = "one two three four five " (24 chars) -> 24 * 0.2 = 4.8.
    // If we delete "one " (4 chars), totalDeleted = 4 <= 4.8 (allowed).
    const oldSum = createSummary("one two three four five ", 24, 0);
    const result = computeDeletion(oldSum, "two three four five ");

    expect(result.deleted).to.deep.equal(["one "]);
    expect(result.totalDeletedLength).to.equal(4);
    void expect(result.allowed).to.be.true;
  });

  it("should detect deletions and disallow if exceeding maxDeletionRatio (> 20%)", () => {
    // 25 characters length. 20% is 5 chars. Delete "one two " (8 chars).
    const old = createSummary("one two three four five", 23, 0); // 23 * 0.2 = 4.6
    const result = computeDeletion(old, "three four five"); // deleted "one two " (8 chars)

    expect(result.deleted).to.deep.equal(["one two "]);
    expect(result.totalDeletedLength).to.equal(8);
    void expect(result.allowed).to.be.false;
  });

  it("should ignore case when computing deletions", () => {
    const old = createSummary("Hello World");
    const result = computeDeletion(old, "hello WORLD");

    expect(result.deleted).to.deep.equal([]);
    expect(result.totalDeletedLength).to.equal(0);
    void expect(result.allowed).to.be.true;
  });

  it("should accumulate deletedLength properly and disallow if total exceeds ratio", () => {
    // 25 characters initial length. 20% is 5 chars.
    // If deletedLength is already 3, and we delete "one " (4 chars), total deleted = 7 (> 5)
    const old = createSummary("one two three four five", 25, 3);
    const result = computeDeletion(old, "two three four five"); // deleted "one " (4 chars)

    expect(result.deleted).to.deep.equal(["one "]);
    expect(result.totalDeletedLength).to.equal(7);
    void expect(result.allowed).to.be.false;
  });

  it("should allow accumulated deletions if total is within ratio", () => {
    // 25 characters initial length. 20% is 5 chars.
    // If deletedLength is already 1, and we delete "one " (4 chars), total deleted = 5 (<= 5)
    const old = createSummary("one two three four five", 25, 1);
    const result = computeDeletion(old, "two three four five"); // deleted "one " (4 chars)

    expect(result.deleted).to.deep.equal(["one "]);
    expect(result.totalDeletedLength).to.equal(5);
    void expect(result.allowed).to.be.true;
  });
});
