import { expect } from "chai";
import {
  ALL_SHUDONG_EMOJIS,
  insertEmojiAtCursor,
  QUICK_SHUDONG_EMOJIS,
} from "./ShudongEmojiBar";

describe("ShudongEmojiBar", () => {
  describe("insertEmojiAtCursor", () => {
    it("should append when selection indices are undefined or null", () => {
      const resUndefined = insertEmojiAtCursor("加油", "💪");
      expect(resUndefined.nextValue).to.equal("加油💪");
      expect(resUndefined.nextCursor).to.equal(4);

      const resNull = insertEmojiAtCursor("hello", "🎉", null, null);
      expect(resNull.nextValue).to.equal("hello🎉");
      expect(resNull.nextCursor).to.equal(7);
    });

    it("should insert emoji at cursor inside Chinese/ASCII text", () => {
      const emoji = "🤗";
      const res = insertEmojiAtCursor("加油hi", emoji, 2, 2);
      expect(res.nextValue).to.equal("加油🤗hi");
      expect(res.nextCursor).to.equal(2 + emoji.length);
    });

    it("should replace a selected substring with the emoji", () => {
      const res = insertEmojiAtCursor("abc def", "💖", 4, 7);
      expect(res.nextValue).to.equal("abc 💖");
      expect(res.nextCursor).to.equal(4 + "💖".length);
    });

    it("should clamp out-of-bounds selection indices safely", () => {
      const resNeg = insertEmojiAtCursor("abc", "😊", -5, -1);
      expect(resNeg.nextValue).to.equal("😊abc");
      expect(resNeg.nextCursor).to.equal("😊".length);

      const resOver = insertEmojiAtCursor("abc", "✨", 10, 20);
      expect(resOver.nextValue).to.equal("abc✨");
      expect(resOver.nextCursor).to.equal(3 + "✨".length);

      const resInverted = insertEmojiAtCursor("abcd", "👏", 3, 1);
      expect(resInverted.nextValue).to.equal("abc👏d");
      expect(resInverted.nextCursor).to.equal(3 + "👏".length);
    });
  });

  describe("emoji sets", () => {
    it("should only contain emojis with Emoji_Presentation", () => {
      for (const emoji of QUICK_SHUDONG_EMOJIS) {
        expect(/\p{Emoji_Presentation}/u.test(emoji)).to.equal(
          true,
          `Expected ${emoji} in QUICK_SHUDONG_EMOJIS to match`,
        );
      }
      for (const emoji of ALL_SHUDONG_EMOJIS) {
        expect(/\p{Emoji_Presentation}/u.test(emoji)).to.equal(
          true,
          `Expected ${emoji} in ALL_SHUDONG_EMOJIS to match`,
        );
      }
    });
  });
});
