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
  if (process.env.ENABLE_INTERVIEWS === "true") {
    features.interviews = true;
  }
  if (process.env.ENABLE_EXAMS === "true") {
    features.exams = true;
  }
  if (process.env.ENABLE_PROJECTS === "true") {
    features.projects = true;
  }
  if (process.env.ENABLE_MENTEE_PROFILE === "true") {
    features.menteeProfile = true;
  }
  return features;
}
