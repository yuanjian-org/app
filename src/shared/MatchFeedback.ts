import z from "zod";
import { zDateColumn } from "./DateColumn";
import { zMinUser } from "./User";

/**
 * When the optional fields are not provided, it means the user has not yet
 * provided feedback for the corresponding mentor or mentee.
 */

export const zMenteeMatchFeedback = z.object({
  type: z.literal("Mentee"),
  mentors: z.array(
    z.object({
      id: z.string().uuid(),
      score: z.number().min(1).max(5).optional(),
      reason: z.string().optional(),

      // For frontend display only
      user: zMinUser.optional(),
    }),
  ),
});
export type MenteeMatchFeedback = z.TypeOf<typeof zMenteeMatchFeedback>;

export const mentorMatchFeedbackChoices = [
  "Prefer",
  "Avoid",
  "Neutral",
] as const;
export const zMentorMatchFeedbackChoice = z.enum(mentorMatchFeedbackChoices);
export type MentorMatchFeedbackChoice = z.TypeOf<
  typeof zMentorMatchFeedbackChoice
>;

export const zMentorMatchFeedback = z.object({
  type: z.literal("Mentor"),
  mentees: z.array(
    z.object({
      id: z.string().uuid(),
      choice: zMentorMatchFeedbackChoice.optional(),
      reason: z.string().optional(),

      // For frontend display only
      user: zMinUser.optional(),
    }),
  ),
});
export type MentorMatchFeedback = z.TypeOf<typeof zMentorMatchFeedback>;

export const zMatchFeedback = z.discriminatedUnion("type", [
  zMenteeMatchFeedback,
  zMentorMatchFeedback,
]);
export type MatchFeedback = z.TypeOf<typeof zMatchFeedback>;

export const zMatchFeedbackAndCreatedAt = z.object({
  feedback: zMatchFeedback,
  createdAt: zDateColumn,
});
export type MatchFeedbackAndCreatedAt = z.TypeOf<
  typeof zMatchFeedbackAndCreatedAt
>;

/**
 * Summarizes feedback items by counting total items, rated/chosen items,
 * and items that include a written reason.
 */
export function summarizeFeedbackItems<
  T extends { score?: unknown; choice?: unknown; reason?: string },
>(items?: T[]): { total: number; scores: number; reasons: number } {
  if (!items) {
    return { total: 0, scores: 0, reasons: 0 };
  }
  let scores = 0;
  let reasons = 0;
  for (const item of items) {
    if (Boolean(item.score || item.choice)) {
      scores += 1;
    }
    if (item.reason) {
      reasons += 1;
    }
  }
  return { total: items.length, scores, reasons };
}
