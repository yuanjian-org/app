import { RefObject } from "react";
import {
  Button,
  Flex,
  Icon,
  IconButton,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Portal,
  SimpleGrid,
  useDisclosure,
} from "@chakra-ui/react";
import { MdOutlineAddReaction } from "react-icons/md";

export const QUICK_SHUDONG_EMOJIS = [
  "🤗",
  "💖",
  "💪",
  "👏",
  "🙏",
  "😊",
  "😂",
  "🎉",
] as const;

export const ALL_SHUDONG_EMOJIS = [
  "🤗",
  "💖",
  "💪",
  "👏",
  "🙏",
  "🤝",
  "😊",
  "🥰",
  "😄",
  "😂",
  "🙌",
  "👍",
  "🥺",
  "😭",
  "😅",
  "🤔",
  "😮",
  "😎",
  "🎉",
  "✨",
  "🌟",
  "🌹",
  "🍀",
  "💡",
] as const;

/**
 * Inserts an emoji at the current selection range (or appends at the end when
 * no selection is provided) and returns the updated text and cursor index.
 */
export function insertEmojiAtCursor(
  value: string,
  emoji: string,
  selectionStart?: number | null,
  selectionEnd?: number | null,
): { nextValue: string; nextCursor: number } {
  const rawStart =
    typeof selectionStart === "number" ? selectionStart : value.length;
  const rawEnd = typeof selectionEnd === "number" ? selectionEnd : value.length;
  const start = Math.max(0, Math.min(rawStart, value.length));
  const end = Math.max(start, Math.min(rawEnd, value.length));
  return {
    nextValue: value.slice(0, start) + emoji + value.slice(end),
    nextCursor: start + emoji.length,
  };
}

/**
 * Compact bar of commonly used emojis plus a popover picker for inserting
 * emojis at the cursor position of a Shudong response Textarea.
 */
export function ShudongEmojiBar({
  value,
  onChange,
  textareaRef,
}: {
  value: string;
  onChange: (nextValue: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    const { nextValue, nextCursor } = insertEmojiAtCursor(
      value,
      emoji,
      textarea?.selectionStart,
      textarea?.selectionEnd,
    );
    onChange(nextValue);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(nextCursor, nextCursor);
      }
    });
  };

  return (
    <Flex align="center" wrap="wrap" gap={0.5}>
      {QUICK_SHUDONG_EMOJIS.map((emoji) => (
        <Button
          key={emoji}
          type="button"
          variant="ghost"
          size="xs"
          minW={7}
          h={7}
          px={1}
          fontSize="md"
          fontWeight="normal"
          aria-label={`插入表情 ${emoji}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleSelect(emoji)}
        >
          {emoji}
        </Button>
      ))}
      <Popover
        isOpen={isOpen}
        onOpen={onOpen}
        onClose={onClose}
        placement="top-start"
        returnFocusOnClose={false}
        isLazy
      >
        <PopoverTrigger>
          <IconButton
            type="button"
            variant="ghost"
            size="xs"
            minW={7}
            h={7}
            color="gray.500"
            aria-label="更多表情"
            icon={<Icon as={MdOutlineAddReaction} boxSize={4} />}
            onMouseDown={(e) => e.preventDefault()}
          />
        </PopoverTrigger>
        <Portal>
          <PopoverContent w="auto" boxShadow="md">
            <PopoverBody p={2}>
              <SimpleGrid columns={6} spacing={1}>
                {ALL_SHUDONG_EMOJIS.map((emoji) => (
                  <Button
                    key={emoji}
                    type="button"
                    variant="ghost"
                    size="sm"
                    minW={8}
                    h={8}
                    px={1}
                    fontSize="lg"
                    fontWeight="normal"
                    aria-label={`插入表情 ${emoji}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      handleSelect(emoji);
                      onClose();
                    }}
                  >
                    {emoji}
                  </Button>
                ))}
              </SimpleGrid>
            </PopoverBody>
          </PopoverContent>
        </Portal>
      </Popover>
    </Flex>
  );
}
