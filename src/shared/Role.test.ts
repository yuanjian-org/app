import { expect } from "chai";
import { isPermitted } from "./Role";

describe("Role Authorization - isPermitted", () => {
  it("should return true when permitted is undefined", () => {
    void expect(isPermitted(["Mentee"])).to.be.true;
    void expect(isPermitted([])).to.be.true;
  });

  it("should return true when permitted is a single string and user has the role", () => {
    void expect(isPermitted(["Mentee", "Volunteer"], "Mentee")).to.be.true;
    void expect(isPermitted(["UserManager"], "UserManager")).to.be.true;
  });

  it("should return false when permitted is a single string and user does not have the role", () => {
    void expect(isPermitted(["Mentee", "Volunteer"], "UserManager")).to.be
      .false;
    void expect(isPermitted([], "UserManager")).to.be.false;
  });

  it("should return true when permitted is an array of roles and user has one of the roles", () => {
    void expect(isPermitted(["Mentee"], ["Mentee", "Volunteer", "UserManager"]))
      .to.be.true;
    void expect(
      isPermitted(
        ["GroupManager", "Volunteer"],
        ["UserManager", "GroupManager"],
      ),
    ).to.be.true;
  });

  it("should return true when permitted is an array of roles and user has multiple roles in the array", () => {
    void expect(
      isPermitted(
        ["Mentee", "Volunteer"],
        ["Mentee", "Volunteer", "UserManager"],
      ),
    ).to.be.true;
  });

  it("should return false when permitted is an array of roles and user has none of the roles", () => {
    void expect(isPermitted(["Mentee"], ["Volunteer", "UserManager"])).to.be
      .false;
    void expect(isPermitted([], ["Mentee", "Volunteer"])).to.be.false;
  });

  it("should return false when permitted is an empty array", () => {
    void expect(isPermitted(["Mentee", "Volunteer"], [])).to.be.false;
    void expect(isPermitted([], [])).to.be.false;
  });
});
