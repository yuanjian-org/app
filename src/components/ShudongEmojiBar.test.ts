import path from "path";
import { createRequire } from "module";
import React from "react";
import { expect } from "chai";

type ShudongEmojiBarMod = typeof import("./ShudongEmojiBar");

const cjsRequire = createRequire(
  path.join(process.cwd(), "src/components/ShudongEmojiBar.test.ts"),
);

describe("ShudongEmojiBar", () => {
  let mod: ShudongEmojiBarMod;
  let rtl: typeof import("@testing-library/react");
  let chakra: typeof import("@chakra-ui/react");
  let cleanupJsdom: (() => void) | undefined;

  before(function () {
    this.timeout(10000);
    const globalObj = globalThis as Record<string, unknown>;
    delete globalObj.document;
    delete globalObj.window;

    const globalJsdom = cjsRequire(
      "global-jsdom",
    ) as typeof import("global-jsdom");
    cleanupJsdom = globalJsdom();

    // Evict DOM-sensitive modules cached by earlier non-JSDOM tests (such as
    // Footer.test.ts) while `document` was undefined so Emotion preserves
    // `React.forwardRef` on Chakra components.
    for (const key of Object.keys(cjsRequire.cache)) {
      const normalized = key.replace(/\\/g, "/");
      if (
        normalized.includes("/node_modules/react-dom/") ||
        normalized.includes("/node_modules/react-focus-lock/") ||
        normalized.includes("/node_modules/@testing-library/") ||
        normalized.includes("/node_modules/@chakra-ui/") ||
        normalized.includes("/node_modules/@emotion/") ||
        normalized.includes("/node_modules/framer-motion/") ||
        (normalized.includes("/src/components/") &&
          !normalized.endsWith(".test.ts"))
      ) {
        delete cjsRequire.cache[key];
      }
    }

    mod = cjsRequire("./ShudongEmojiBar");
    rtl = cjsRequire("@testing-library/react");
    chakra = cjsRequire("@chakra-ui/react");
  });

  after(() => {
    // Cancel pending Chakra/rAF callbacks before removing JSDOM globals.
    if (typeof window !== "undefined") {
      window.close();
    }
    cleanupJsdom?.();
    const globalObj = globalThis as Record<string, unknown>;
    delete globalObj.document;
    delete globalObj.window;
  });

  describe("insertEmojiAtCursor", () => {
    it("should append when selection indices are undefined or null", () => {
      const resUndefined = mod.insertEmojiAtCursor("加油", "💪");
      expect(resUndefined.nextValue).to.equal("加油💪");
      expect(resUndefined.nextCursor).to.equal(4);

      const resNull = mod.insertEmojiAtCursor("hello", "🎉", null, null);
      expect(resNull.nextValue).to.equal("hello🎉");
      expect(resNull.nextCursor).to.equal(7);
    });

    it("should insert emoji at cursor inside Chinese/ASCII text", () => {
      const emoji = "🤗";
      const res = mod.insertEmojiAtCursor("加油hi", emoji, 2, 2);
      expect(res.nextValue).to.equal("加油🤗hi");
      expect(res.nextCursor).to.equal(2 + emoji.length);
    });

    it("should replace a selected substring with the emoji", () => {
      const res = mod.insertEmojiAtCursor("abc def", "💖", 4, 7);
      expect(res.nextValue).to.equal("abc 💖");
      expect(res.nextCursor).to.equal(4 + "💖".length);
    });

    it("should clamp out-of-bounds selection indices safely", () => {
      const resNeg = mod.insertEmojiAtCursor("abc", "😊", -5, -1);
      expect(resNeg.nextValue).to.equal("😊abc");
      expect(resNeg.nextCursor).to.equal("😊".length);

      const resOver = mod.insertEmojiAtCursor("abc", "✨", 10, 20);
      expect(resOver.nextValue).to.equal("abc✨");
      expect(resOver.nextCursor).to.equal(3 + "✨".length);

      const resInverted = mod.insertEmojiAtCursor("abcd", "👏", 3, 1);
      expect(resInverted.nextValue).to.equal("abc👏d");
      expect(resInverted.nextCursor).to.equal(3 + "👏".length);
    });
  });

  describe("applyOptimisticReactionToggle", () => {
    it("should add a new reaction pill when not yet present", () => {
      const next = mod.applyOptimisticReactionToggle([], "🤗");
      expect(next).to.deep.equal([
        { emoji: "🤗", count: 1, userHasReacted: true },
      ]);
    });

    it("should increment count when another user already reacted", () => {
      const initial = [
        { emoji: "🤗" as const, count: 2, userHasReacted: false },
        { emoji: "💖" as const, count: 1, userHasReacted: true },
      ];
      const next = mod.applyOptimisticReactionToggle(initial, "🤗");
      expect(next).to.deep.equal([
        { emoji: "🤗", count: 3, userHasReacted: true },
        { emoji: "💖", count: 1, userHasReacted: true },
      ]);
    });

    it("should decrement count when toggling off and count > 1", () => {
      const initial = [
        { emoji: "🤗" as const, count: 2, userHasReacted: true },
        { emoji: "💖" as const, count: 1, userHasReacted: false },
      ];
      const next = mod.applyOptimisticReactionToggle(initial, "🤗");
      expect(next).to.deep.equal([
        { emoji: "🤗", count: 1, userHasReacted: false },
        { emoji: "💖", count: 1, userHasReacted: false },
      ]);
    });

    it("should remove the pill when toggling off drops count to 0", () => {
      const initial = [
        { emoji: "🤗" as const, count: 1, userHasReacted: true },
        { emoji: "💖" as const, count: 3, userHasReacted: false },
      ];
      const next = mod.applyOptimisticReactionToggle(initial, "🤗");
      expect(next).to.deep.equal([
        { emoji: "💖", count: 3, userHasReacted: false },
      ]);
    });
  });

  describe("ShudongEmojiPopover", () => {
    afterEach(() => {
      rtl.cleanup();
    });

    it("opens on click, selects emoji, and blocks anchor click", () => {
      let anchorClicks = 0;
      const selected: string[] = [];

      const { getByLabelText, queryByLabelText } = rtl.render(
        React.createElement(
          chakra.ChakraProvider,
          null,
          React.createElement(
            "a",
            {
              href: "/shudong/123",
              onClick: () => {
                anchorClicks += 1;
              },
            },
            React.createElement(mod.ShudongEmojiPopover, {
              onSelect: (emoji) => {
                selected.push(emoji);
              },
              ariaLabel: "添加表情回应",
            }),
          ),
        ),
      );

      const trigger = getByLabelText("添加表情回应");
      expect(trigger.getAttribute("aria-expanded")).to.equal("false");
      expect(queryByLabelText("选择表情 🤗")).to.equal(null);

      // Clicking the trigger must open the popover and prevent anchor click.
      const notCancelled = rtl.fireEvent.click(trigger);
      expect(notCancelled).to.equal(false);
      expect(trigger.getAttribute("aria-expanded")).to.equal("true");
      expect(anchorClicks).to.equal(0);

      const emojiBtn = getByLabelText("选择表情 🤗");
      rtl.fireEvent.click(emojiBtn);
      expect(selected).to.deep.equal(["🤗"]);
      expect(trigger.getAttribute("aria-expanded")).to.equal("false");
      expect(anchorClicks).to.equal(0);

      // Clicking the trigger twice toggles the popover open then closed.
      rtl.fireEvent.click(trigger);
      expect(trigger.getAttribute("aria-expanded")).to.equal("true");
      rtl.fireEvent.click(trigger);
      expect(trigger.getAttribute("aria-expanded")).to.equal("false");
      expect(anchorClicks).to.equal(0);
    });

    it("inserts emoji from ShudongEmojiBar more-emoji popover", () => {
      const changes: string[] = [];
      const textareaRef = React.createRef<HTMLTextAreaElement>();

      const { getByLabelText } = rtl.render(
        React.createElement(
          chakra.ChakraProvider,
          null,
          React.createElement(mod.ShudongEmojiBar, {
            value: "加油",
            onChange: (next) => {
              changes.push(next);
            },
            textareaRef,
          }),
        ),
      );

      const trigger = getByLabelText("更多表情");
      expect(trigger.getAttribute("aria-expanded")).to.equal("false");

      rtl.fireEvent.click(trigger);
      expect(trigger.getAttribute("aria-expanded")).to.equal("true");

      rtl.fireEvent.click(getByLabelText("选择表情 🎉"));
      expect(changes).to.deep.equal(["加油🎉"]);
      expect(trigger.getAttribute("aria-expanded")).to.equal("false");
    });

    it("supports pill trigger variant while blocking anchor clicks", () => {
      let anchorClicks = 0;
      const selected: string[] = [];

      const { getByLabelText, queryByLabelText } = rtl.render(
        React.createElement(
          chakra.ChakraProvider,
          null,
          React.createElement(
            "a",
            {
              href: "/shudong/456",
              onClick: () => {
                anchorClicks += 1;
              },
            },
            React.createElement(mod.ShudongEmojiPopover, {
              onSelect: (emoji) => {
                selected.push(emoji);
              },
              ariaLabel: "添加表情回应",
              variant: "pill",
            }),
          ),
        ),
      );

      const trigger = getByLabelText("添加表情回应");
      expect(trigger.getAttribute("aria-expanded")).to.equal("false");
      expect(queryByLabelText("选择表情 👍")).to.equal(null);

      const notCancelled = rtl.fireEvent.click(trigger);
      expect(notCancelled).to.equal(false);
      expect(trigger.getAttribute("aria-expanded")).to.equal("true");
      expect(anchorClicks).to.equal(0);

      rtl.fireEvent.click(getByLabelText("选择表情 👍"));
      expect(selected).to.deep.equal(["👍"]);
      expect(trigger.getAttribute("aria-expanded")).to.equal("false");
      expect(anchorClicks).to.equal(0);
    });

    it("stays open inside Modal without stealing Textarea focus", async () => {
      let modalCloseCount = 0;

      function ModalEditorHarness() {
        const [value, setValue] = React.useState("你好世界");
        const textareaRef = React.useRef<HTMLTextAreaElement>(null);
        return React.createElement(
          chakra.ChakraProvider,
          null,
          React.createElement(
            chakra.Modal,
            {
              isOpen: true,
              onClose: () => {
                modalCloseCount += 1;
              },
              initialFocusRef: textareaRef,
            },
            React.createElement(chakra.ModalOverlay),
            React.createElement(
              chakra.ModalContent,
              null,
              React.createElement(
                chakra.ModalBody,
                null,
                React.createElement(chakra.Textarea, {
                  ref: textareaRef,
                  "aria-label": "问题内容",
                  value,
                  onChange: (e) => setValue(e.target.value),
                }),
                React.createElement(mod.ShudongEmojiBar, {
                  value,
                  onChange: setValue,
                  textareaRef,
                }),
              ),
            ),
          ),
        );
      }

      const { getByLabelText } = rtl.render(
        React.createElement(ModalEditorHarness),
      );

      await rtl.act(async () => {
        await new Promise((r) => setTimeout(r, 30));
      });

      const textarea = getByLabelText("问题内容") as HTMLTextAreaElement;
      textarea.focus();
      textarea.setSelectionRange(2, 2);
      expect(document.activeElement).to.equal(textarea);

      const trigger = getByLabelText("更多表情");
      await rtl.act(async () => {
        rtl.fireEvent.click(trigger);
        await new Promise((r) => setTimeout(r, 30));
      });

      // Popover must remain open after rAF/FocusLock settles and keep focus on
      // the Modal's Textarea.
      expect(trigger.getAttribute("aria-expanded")).to.equal("true");
      expect(document.activeElement).to.equal(textarea);
      expect(modalCloseCount).to.equal(0);

      const emojiBtn = getByLabelText("选择表情 🎉");
      const popoverDialog = emojiBtn.closest('[role="dialog"]');
      expect(popoverDialog).to.not.equal(null);
      const mouseDownAllowed = rtl.fireEvent.mouseDown(popoverDialog!);
      expect(mouseDownAllowed).to.equal(false);

      await rtl.act(async () => {
        rtl.fireEvent.click(emojiBtn);
        await new Promise((r) => setTimeout(r, 30));
      });

      expect(textarea.value).to.equal("你好🎉世界");
      expect(trigger.getAttribute("aria-expanded")).to.equal("false");
      expect(modalCloseCount).to.equal(0);
    });
  });
});
