import { expect } from "chai";
import { getWhiteLabel } from "./getWhiteLabel";

describe("getWhiteLabel", () => {
  let originalWhiteLabel: string | undefined;

  beforeEach(() => {
    originalWhiteLabel = process.env.WHITE_LABEL;
  });

  afterEach(() => {
    if (originalWhiteLabel === undefined) {
      delete process.env.WHITE_LABEL;
    } else {
      process.env.WHITE_LABEL = originalWhiteLabel;
    }
  });

  it("should return the correctly parsed valid white label", () => {
    process.env.WHITE_LABEL = "demo";
    expect(getWhiteLabel()).to.equal("demo");

    process.env.WHITE_LABEL = "ustc";
    expect(getWhiteLabel()).to.equal("ustc");

    process.env.WHITE_LABEL = "yuantu";
    expect(getWhiteLabel()).to.equal("yuantu");

    process.env.WHITE_LABEL = "xhef";
    expect(getWhiteLabel()).to.equal("xhef");

    process.env.WHITE_LABEL = "x";
    expect(getWhiteLabel()).to.equal("x");
  });

  it("should fallback to yuantu when WHITE_LABEL is missing", () => {
    delete process.env.WHITE_LABEL;
    expect(getWhiteLabel()).to.equal("yuantu");
  });

  it("should fallback to yuantu when WHITE_LABEL is invalid", () => {
    process.env.WHITE_LABEL = "invalid_value";
    expect(getWhiteLabel()).to.equal("yuantu");
  });
});
