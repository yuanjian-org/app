import { Features } from "../shared/Features";

export function getFeatures(): Features {
  return {
    orgs: process.env.ENABLE_ORGS === "true",
    relational: process.env.ENABLE_RELATIONAL === "true",
  };
}
