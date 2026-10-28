import { expect } from "chai";
import { nameToColor } from "./avatars";

describe("nameToColor", () => {
  it("generates distinct colors for names sharing leading characters", () => {
    const names = ["匿名楼主", "匿名 甲", "匿名 乙", "匿名 丙"];
    const colors = names.map(nameToColor);

    // Every generated string should be a valid 6-digit hex color.
    for (const color of colors) {
      expect(color).to.match(/^#[0-9a-f]{6}$/);
    }

    // All names sharing the "匿名" prefix should have distinct colors.
    expect(new Set(colors).size).to.equal(names.length);
  });

  it("is deterministic and handles empty strings", () => {
    expect(nameToColor("匿名 甲")).to.equal(nameToColor("匿名 甲"));
    expect(nameToColor("")).to.equal("#a0aec0");
  });
});
