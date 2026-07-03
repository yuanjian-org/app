import { expect } from "chai";
import { getWhiteLabel } from "./getWhiteLabel";

describe("getWhiteLabel", () => {
  let originalWhiteLabel: string | undefined;

  beforeEach(() => {
    originalWhiteLabel = process.env.NEXT_PUBLIC_WHITE_LABEL;
  });

  afterEach(() => {
    if (originalWhiteLabel === undefined) {
      delete process.env.NEXT_PUBLIC_WHITE_LABEL;
    } else {
      process.env.NEXT_PUBLIC_WHITE_LABEL = originalWhiteLabel;
    }
  });

  it("should return the correctly parsed valid white label", () => {
    process.env.NEXT_PUBLIC_WHITE_LABEL = "demo";
    expect(getWhiteLabel()).to.equal("demo");

    process.env.NEXT_PUBLIC_WHITE_LABEL = "ustc";
    expect(getWhiteLabel()).to.equal("ustc");

    process.env.NEXT_PUBLIC_WHITE_LABEL = "yuantu";
    expect(getWhiteLabel()).to.equal("yuantu");

    process.env.NEXT_PUBLIC_WHITE_LABEL = "xhef";
    expect(getWhiteLabel()).to.equal("xhef");

    process.env.NEXT_PUBLIC_WHITE_LABEL = "x";
    expect(getWhiteLabel()).to.equal("x");
  });

  it("should fallback to yuantu when NEXT_PUBLIC_WHITE_LABEL is missing", () => {
    delete process.env.NEXT_PUBLIC_WHITE_LABEL;
    expect(getWhiteLabel()).to.equal("yuantu");
  });

  it("should fallback to yuantu when NEXT_PUBLIC_WHITE_LABEL is invalid", () => {
    process.env.NEXT_PUBLIC_WHITE_LABEL = "invalid_value";
    expect(getWhiteLabel()).to.equal("yuantu");
  });
});
