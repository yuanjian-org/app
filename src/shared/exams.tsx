export const defaultExamExpiryDays = 365;

// 300 days instead of 365 days because the start of the next interview
// cycle varies from year to year.
export const interviewExamExpiryDays = 300;

function parseDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  return new Date(date);
}

/**
 * @param examPassDate Assume the exam is expired if undefined
 */
export function isExamExpired(
  examPassDate: Date | string | null | undefined,
  expiryDays: number = defaultExamExpiryDays,
): boolean {
  const parsedDate = parseDate(examPassDate);
  if (!parsedDate) return true;
  const now = new Date();
  const diffDays = (now.getTime() - parsedDate.getTime()) / (1000 * 3600 * 24);
  return diffDays > expiryDays;
}

/**
 * @param examPassDate Assume the exam is expired if undefined
 * @returns Whether the exam is about to expire or already expired
 */
export function isExamAboutToExpire(
  examPassDate: Date | string | null | undefined,
  expiryDays: number = defaultExamExpiryDays,
): boolean {
  return isExamExpired(examPassDate, expiryDays - 30);
}
