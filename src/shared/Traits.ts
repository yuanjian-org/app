import invariant from "tiny-invariant";
import { z } from "zod";
import { UserProfile } from "./UserProfile";
import { menteeFirstYearInCollegeField } from "./applicationFields";

const zNum = z.number().optional();

/**
 * This type is used in two different ways:
 * 1. The traits of a person.
 * 2. The preference of a mentor for a mentee's traits.
 * 
 * The meaning of the field values differ in the two cases:
 * 1. For a person, the values are the strengths of the traits,
 *    ranging from [-maxTraitAbsValue, maxTraitAbsValue].
 * 2. For a mentor, the values are the preference scores of the traits. It can
 *    be one of the four values: (-hardTraitPrefAbsValue, -softTraitPrefAbsValue,
 *    softTraitPrefAbsValue, hardTraitPrefAbsValue).
 */
export const zTraits = z.object({
  农村vs城市: zNum,
  内敛vs外向: zNum,
  慢热vs快热: zNum,
  安逸vs奋斗: zNum,
  顺从vs独立: zNum,
  思考者vs实干家: zNum,
  创业vs大厂: zNum,
  科研vs非科研: zNum,

  其他: z.string().optional(),
});
export type Traits = z.TypeOf<typeof zTraits>;

export const zTraitsPreference = zTraits.merge(z.object({
  男vs女: zNum,
  低年级vs高年级: zNum,
}));
export type TraitsPreference = z.TypeOf<typeof zTraitsPreference>;

export const maxTraitAbsValue = 2;
export const hardTraitPrefAbsValue = 1000;
export const softTraitPrefAbsValue = 1;

export const hardMismatchScore = -666;

export function isTraitsComplete(traits: Traits | undefined) {
  return traits && Object.keys(zTraits.shape)
    .filter(k => k !== "其他")
    .every(k => k in traits);
}

function isHardTraitPref(pv: number) {
  return Math.abs(pv) === hardTraitPrefAbsValue;
}

/**
 * The higher the score, the better matching the mentee and mentor are. 0 is
 * neutral. The score is hardMismatchScore if there is a mismatch with a hard
 * preference (which is defined as an absolute preference value of
 * hardTraitPrefAbsValue). Otherwise, the score is the sum of the product of
 * the trait values and the preference values.
 * 
 * @returns The matching score and the keys of the traits that are matching.
 * Return empty `matchingTraits` if the score is `hardMismatchScore`.
 */
export function computeTraitsMatchingScore(
  menteeProfile: UserProfile,
  menteeApp: Record<string, any> | null,
  pref: TraitsPreference | null,
): {
  score: number,
  matchingTraits: (keyof TraitsPreference)[],
} {
  let score = 0;

  const traits = menteeProfile.特质;
  if (!traits || !pref) return { score, matchingTraits: [] };

  /**
   * Sex and year in college are special cases as they are specified outside
   * of the Traits object. We first combine them with other traits into a
   * unified data structure to simplify the code that follows.
   */
  type UnifiedTraits = {
    [K in keyof TraitsPreference]: number | undefined;
  };
  const unified: UnifiedTraits = {};

  for (const key in pref) {
    if (key === "其他") {
      continue;

    } else if (key === "男vs女") {
      unified[key] = menteeProfile.性别 === "男" ?
        // N.B. Sign must be consistent with components/Traits.tsx
        -maxTraitAbsValue : maxTraitAbsValue;

    } else if (key === "低年级vs高年级") {
      const currentYear = new Date().getFullYear();
      const freshmenYear = parseInt(menteeApp?.[menteeFirstYearInCollegeField]);

      // Check validity of the year. parseInt() returns NaN if the string is
      // null, undefined or invalid number. Plus 20 is to allow mentees to enter
      // a future college entrance year.
      if (isNaN(freshmenYear) || freshmenYear < 2000 ||
        freshmenYear > currentYear + 20) {
        continue;
      }

      // Use 3rd year in college as the neutral point.
      // N.B. Sign must be consistent with components/Traits.tsx
      unified[key] = maxTraitAbsValue * Math.max(-1, Math.min(1,
        (currentYear - freshmenYear - 3) / 3));

    } else {
      unified[key as keyof UnifiedTraits] =
        traits[key as keyof Traits] as number | undefined;
    }
  }

  /**
   * Do the actual score calculation.
   */

  const matchingTraits: (keyof TraitsPreference)[] = [];

  for (const [key, tv] of Object.entries(unified)) {
    if (tv === undefined) continue;

    const pv = pref[key as keyof TraitsPreference];
    invariant(typeof pv === "number" && typeof tv === "number");

    if (pv * tv > 0) {
      matchingTraits.push(key as keyof TraitsPreference);
    }

    if (isHardTraitPref(pv)) {
      if (pv * tv < 0) {
        return { score: hardMismatchScore, matchingTraits: [] };
      } else {
        score += tv * (pv > 0 ? softTraitPrefAbsValue : -softTraitPrefAbsValue);
      }
    } else {
      score += tv * pv;
    }
  }

  return { score, matchingTraits };
}
