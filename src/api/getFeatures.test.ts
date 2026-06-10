import { expect } from "chai";
import { getFeatures } from "./getFeatures";

describe("getFeatures", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };

    delete process.env.ENABLE_ORGS;
    delete process.env.ENABLE_RELATIONAL;
    delete process.env.ENABLE_VOLUNTEERS;
    delete process.env.ENABLE_INTERVIEWS;
    delete process.env.ENABLE_EXAMS;
    delete process.env.ENABLE_PROJECTS;
    delete process.env.ENABLE_MENTEE_PROFILE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return an empty object when no flags are set", () => {
    const features = getFeatures();
    expect(features).to.deep.equal({});
  });

  it("should return true for flags set to 'true'", () => {
    process.env.ENABLE_ORGS = "true";
    process.env.ENABLE_EXAMS = "true";
    process.env.ENABLE_MENTEE_PROFILE = "true";

    const features = getFeatures();
    expect(features).to.deep.equal({
      orgs: true,
      exams: true,
      menteeProfile: true,
    });
  });

  it("should ignore flags not set to exactly 'true'", () => {
    process.env.ENABLE_RELATIONAL = "false";
    process.env.ENABLE_VOLUNTEERS = "1";
    process.env.ENABLE_INTERVIEWS = "TRUE";
    process.env.ENABLE_PROJECTS = "yes";

    const features = getFeatures();
    expect(features).to.deep.equal({});
  });

  it("should handle all flags being true at once", () => {
    process.env.ENABLE_ORGS = "true";
    process.env.ENABLE_RELATIONAL = "true";
    process.env.ENABLE_VOLUNTEERS = "true";
    process.env.ENABLE_INTERVIEWS = "true";
    process.env.ENABLE_EXAMS = "true";
    process.env.ENABLE_PROJECTS = "true";
    process.env.ENABLE_MENTEE_PROFILE = "true";

    const features = getFeatures();
    expect(features).to.deep.equal({
      orgs: true,
      relational: true,
      volunteers: true,
      interviews: true,
      exams: true,
      projects: true,
      menteeProfile: true,
    });
  });
});
