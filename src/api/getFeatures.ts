import { Features } from "../shared/Features";

export function getFeatures(): Features {
  const features: Features = {};
  if (process.env.ENABLE_ORGS === "true") {
    features.orgs = true;
  }
  if (process.env.ENABLE_RELATIONAL === "true") {
    features.relational = true;
  }
  if (process.env.ENABLE_VOLUNTEERS === "true") {
    features.volunteers = true;
  }
  return features;
}
