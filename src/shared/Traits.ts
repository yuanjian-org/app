import { z } from "zod";

const zNum = z.number().optional();

/**
 * This type is used in two different ways:
 * 1. The traits of a person.
 * 2. The preference of a mentor for a mentee's traits.
 * 
 * The meaning of the field values differ in the two cases:
 * 1. For a person, the values are the strengths of the traits.
 * 2. For a mentor, the values are the preference scores of the traits.
 * 
 * Refer to frontend code for field value ranges.
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

export const zMenteeTraitsPreference = zTraits.merge(z.object({
  // These mentee traits are specified outside of the Traits object, hence
  // they are specified only here.
  男vs女: zNum,
  低年级vs高年级: zNum,
}));
export type MenteeTraitsPreference = z.TypeOf<typeof zMenteeTraitsPreference>;
