/**
 * The type of user identifier used in login, verification process, etc.
 */

import { z } from "zod";

export const AllIdTypes = ["phone", "email"] as const;
export const zIdType = z.enum(AllIdTypes);
export type IdType = (typeof AllIdTypes)[number];
