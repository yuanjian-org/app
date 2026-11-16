import { MouseEvent, RefObject } from "react";
import {
  Box,
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
import {
  quickShudongEmojis,
  shudongEmojis,
  ShudongEmoji,
  ShudongReactionSummary,
} from "shared/Shudong";

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
 * Computes the next reaction summaries after the current user toggles an
 * emoji reaction optimistically, removing pills whose count reaches zero.
 */
export function applyOptimisticReactionToggle(
  reactions: ShudongReactionSummary[],
  emoji: ShudongEmoji,
): ShudongReactionSummary[] {
  const idx = reactions.findIndex((r) => r.emoji === emoji);
  if (idx === -1) {
    return [...reactions, { emoji, count: 1, userHasReacted: true }];
  }
  const target = reactions[idx];
  if (target.userHasReacted) {
    if (target.count <= 1) {
      return reactions.filter((_, i) => i !== idx);
    }
    return reactions.map((r, i) =>
      i === idx ? { ...r, count: r.count - 1, userHasReacted: false } : r,
    );
  }
  return reactions.map((r, i) =>
    i === idx ? { ...r, count: r.count + 1, userHasReacted: true } : r,
  );
}

/**
 * Reusable trigger icon + 6x4 emoji popover picker used both for text
 * insertion and for toggling post reactions.
 */
export function ShudongEmojiPopover({
  onSelect,
  activeEmojis,
  ariaLabel = "更多表情",
  color = "gray.500",
  variant = "ghost",
}: {
  onSelect: (emoji: ShudongEmoji) => void;
  activeEmojis?: ReadonlySet<string>;
  ariaLabel?: string;
  color?: string;
  variant?: "ghost" | "pill";
}) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isPill = variant === "pill";

  return (
    <Box
      as="span"
      display="inline-flex"
      onClick={(e: MouseEvent<HTMLSpanElement>) => {
        // Stop bubbling after PopoverTrigger handles clicks so card links
        // on /shudong do not navigate when opening the picker.
        e.preventDefault();
        e.stopPropagation();
      }}
    >
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
            minW={isPill ? "30px" : 7}
            h={isPill ? "26px" : 7}
            px={0}
            borderRadius={isPill ? "full" : "md"}
            borderWidth={isPill ? "1px" : undefined}
            borderColor={isPill ? "gray.200" : undefined}
            bg={isPill ? "white" : undefined}
            color={color}
            _hover={
              isPill
                ? { bg: "gray.100", borderColor: "gray.300", color: "gray.700" }
                : undefined
            }
            aria-label={ariaLabel}
            icon={<Icon as={MdOutlineAddReaction} boxSize={4} />}
            onMouseDown={(e) => e.preventDefault()}
          />
        </PopoverTrigger>
        <Portal>
          <PopoverContent
            w="auto"
            boxShadow="md"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <PopoverBody p={2}>
              <SimpleGrid columns={6} spacing={1}>
                {shudongEmojis.map((emoji) => {
                  const isActive = activeEmojis?.has(emoji);
                  return (
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
                      borderRadius="md"
                      bg={isActive ? "blue.50" : undefined}
                      borderWidth={isActive ? "1px" : undefined}
                      borderColor={isActive ? "blue.200" : undefined}
                      _hover={{ bg: isActive ? "blue.100" : "gray.100" }}
                      aria-label={`选择表情 ${emoji}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelect(emoji);
                        onClose();
                      }}
                    >
                      {emoji}
                    </Button>
                  );
                })}
              </SimpleGrid>
            </PopoverBody>
          </PopoverContent>
        </Portal>
      </Popover>
    </Box>
  );
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
      {quickShudongEmojis.map((emoji) => (
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
      <ShudongEmojiPopover onSelect={handleSelect} color="gray.500" />
    </Flex>
  );
}
