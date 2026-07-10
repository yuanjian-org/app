import { MinUserAndProfile } from "shared/UserProfile";

export type UserDisplayData = MinUserAndProfile & {
  // The presence of these fields depends on call sites and context
  traitsMatchingScore?: number;
  likes?: number;
  kudos?: number;
};
