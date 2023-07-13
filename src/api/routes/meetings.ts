/**
 * TODO Move this file away from this folder.
 */
import z from 'zod';
import invariant from 'tiny-invariant';

const meetingSubjectseparator = ' | ';

export function encodeMeetingSubject(groupId: string, description: string): string {
  invariant(z.string().uuid().safeParse(groupId).success);
  return description + meetingSubjectseparator + groupId;
}

/**
 * @returns Group Id or `null` if the decoded Group Id isn't a valid UUID stirng.
 */
export function safeDecodeMeetingSubject(subject: string): string | null {
  const parts = subject.split(meetingSubjectseparator);
  invariant(parts.length > 0);
  // Some legacy meeting IDs don't have the description part.
  const parsed = z.string().uuid().safeParse(parts.length == 2 ? parts[1] : subject);
  return parsed.success ? parsed.data : null;
}
