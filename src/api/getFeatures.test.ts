import { expect } from "chai";
import { getFeatures } from "./getFeatures";

describe("getFeatures", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Keep a shallow copy of the environment variables to restore them later
    originalEnv = { ...process.env };

    Object.keys(process.env).forEach((k) => delete process.env[k]);
  });

  afterEach(() => {
    Object.keys(process.env).forEach((k) => delete process.env[k]);

    for (const key in originalEnv) {
      process.env[key] = originalEnv[key];
    }
  });

  it("should return an empty object when no features are enabled", () => {
    const features = getFeatures();
    expect(features).to.deep.equal({});
  });

  it("should enable orgs feature when ENABLE_ORGS is true", () => {
    process.env.ENABLE_ORGS = "true";
    const features = getFeatures();
    void expect(features.orgs).to.be.true;
  });

  it("should enable relational feature when ENABLE_RELATIONAL is true", () => {
    process.env.ENABLE_RELATIONAL = "true";
    const features = getFeatures();
    void expect(features.relational).to.be.true;
  });

  it("should enable volunteers feature when ENABLE_VOLUNTEERS is true", () => {
    process.env.ENABLE_VOLUNTEERS = "true";
    const features = getFeatures();
    void expect(features.volunteers).to.be.true;
  });

  it("should enable interviews feature when ENABLE_INTERVIEWS is true", () => {
    process.env.ENABLE_INTERVIEWS = "true";
    const features = getFeatures();
    void expect(features.interviews).to.be.true;
  });

  it("should enable exams feature when ENABLE_EXAMS is true", () => {
    process.env.ENABLE_EXAMS = "true";
    const features = getFeatures();
    void expect(features.exams).to.be.true;
  });

  it("should enable projects feature when ENABLE_PROJECTS is true", () => {
    process.env.ENABLE_PROJECTS = "true";
    const features = getFeatures();
    void expect(features.projects).to.be.true;
  });

  it("should enable menteeProfile feature when ENABLE_MENTEE_PROFILE is true", () => {
    process.env.ENABLE_MENTEE_PROFILE = "true";
    const features = getFeatures();
    void expect(features.menteeProfile).to.be.true;
  });

  it("should enable multiple features simultaneously", () => {
    process.env.ENABLE_ORGS = "true";
    process.env.ENABLE_PROJECTS = "true";

    const features = getFeatures();
    void expect(features.orgs).to.be.true;
    void expect(features.projects).to.be.true;

    // Other features should be disabled
    void expect(features.relational).to.be.undefined;
  });

  it("should not enable features when env var is not exactly 'true'", () => {
    process.env.ENABLE_ORGS = "false";
    process.env.ENABLE_RELATIONAL = "1";
    process.env.ENABLE_VOLUNTEERS = "TRUE";
    process.env.ENABLE_INTERVIEWS = "yes";

    const features = getFeatures();

    void expect(features.orgs).to.be.undefined;
    void expect(features.relational).to.be.undefined;
    void expect(features.volunteers).to.be.undefined;
    void expect(features.interviews).to.be.undefined;
  });
});
