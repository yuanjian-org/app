import { expect } from "chai";
import { getFeatures } from "./getFeatures";

describe("getFeatures", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  it("should return empty object when no features are enabled", () => {
    delete process.env.ENABLE_ORGS;
    delete process.env.ENABLE_RELATIONAL;
    delete process.env.ENABLE_VOLUNTEERS;
    delete process.env.ENABLE_INTERVIEWS;
    delete process.env.ENABLE_EXAMS;
    delete process.env.ENABLE_MENTEE_PROFILE;

    const features = getFeatures();
    expect(features).to.deep.equal({});
  });

  it("should return enabled features based on environment variables", () => {
    process.env.ENABLE_ORGS = "true";
    process.env.ENABLE_RELATIONAL = "true";
    process.env.ENABLE_VOLUNTEERS = "true";
    process.env.ENABLE_INTERVIEWS = "true";
    process.env.ENABLE_EXAMS = "true";
    process.env.ENABLE_MENTEE_PROFILE = "true";

    const features = getFeatures();
    expect(features).to.deep.equal({
      orgs: true,
      relational: true,
      volunteers: true,
      interviews: true,
      exams: true,
      menteeProfile: true,
    });
  });

  it("should not enable features when environment variables are set to 'false' or other values", () => {
    process.env.ENABLE_ORGS = "false";
    process.env.ENABLE_RELATIONAL = "0";
    process.env.ENABLE_VOLUNTEERS = "yes";
    process.env.ENABLE_INTERVIEWS = "";
    process.env.ENABLE_EXAMS = "null";
    process.env.ENABLE_MENTEE_PROFILE = "TRUE"; // Note: string comparison is strict "true"

    const features = getFeatures();
    expect(features).to.deep.equal({});
  });

  it("should handle a mix of enabled and disabled features", () => {
    delete process.env.ENABLE_ORGS;
    process.env.ENABLE_RELATIONAL = "true";
    delete process.env.ENABLE_VOLUNTEERS;
    process.env.ENABLE_INTERVIEWS = "true";
    process.env.ENABLE_EXAMS = "false";
    process.env.ENABLE_MENTEE_PROFILE = "true";

    const features = getFeatures();
    expect(features).to.deep.equal({
      relational: true,
      interviews: true,
      menteeProfile: true,
    });
  });
});
