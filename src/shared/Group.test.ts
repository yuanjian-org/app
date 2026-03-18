import { expect } from "chai";
import {
  isPermittedToAccessGroup,
  isPermittedToAccessGroupHistory,
  Group,
} from "./Group";
import User from "./User";

describe("Group Authorization", () => {
  const mockUserBase: User = {
    id: "user-1",
    name: "Test User",
    url: "test-user",
    roles: [],
    email: null,
    phone: null,
    wechat: null,
    menteeStatus: null,
    pointOfContact: null,
    pointOfContactNote: null,
  };

  const mockGroupBase: Group = {
    id: "group-1",
    name: "Test Group",
    users: [],
    public: false,
    archived: false,
    partnershipId: null,
    interviewId: null,
  };

  describe("isPermittedToAccessGroupHistory", () => {
    it("should allow a user with the GroupManager role to access group history", () => {
      const user: User = { ...mockUserBase, roles: ["GroupManager"] };
      const group: Group = { ...mockGroupBase };

      const result = isPermittedToAccessGroupHistory(user, group);
      void expect(result).to.be.true;
    });

    it("should allow a user in the group to access group history", () => {
      const user: User = { ...mockUserBase, id: "member-1" };
      const group: Group = {
        ...mockGroupBase,
        users: [{ id: "member-1", name: "Member 1", url: "member-1" }],
      };

      const result = isPermittedToAccessGroupHistory(user, group);
      void expect(result).to.be.true;
    });

    it("should not allow a user without the GroupManager role and not in the group to access group history", () => {
      const user: User = {
        ...mockUserBase,
        id: "non-member",
        roles: ["Mentee"],
      };
      const group: Group = {
        ...mockGroupBase,
        users: [{ id: "member-1", name: "Member 1", url: "member-1" }],
      };

      const result = isPermittedToAccessGroupHistory(user, group);
      void expect(result).to.be.false;
    });
  });

  describe("isPermittedToAccessGroup", () => {
    it("should allow any user to access a public group", () => {
      const user: User = {
        ...mockUserBase,
        id: "random-user",
        roles: ["Volunteer"],
      };
      const group: Group = { ...mockGroupBase, public: true };

      const result = isPermittedToAccessGroup(user, group);
      void expect(result).to.be.true;
    });

    it("should allow a GroupManager to access a private group", () => {
      const user: User = { ...mockUserBase, roles: ["GroupManager"] };
      const group: Group = { ...mockGroupBase, public: false };

      const result = isPermittedToAccessGroup(user, group);
      void expect(result).to.be.true;
    });

    it("should allow a group member to access a private group", () => {
      const user: User = { ...mockUserBase, id: "member-1" };
      const group: Group = {
        ...mockGroupBase,
        public: false,
        users: [{ id: "member-1", name: "Member 1", url: "member-1" }],
      };

      const result = isPermittedToAccessGroup(user, group);
      void expect(result).to.be.true;
    });

    it("should not allow a non-member without GroupManager role to access a private group", () => {
      const user: User = {
        ...mockUserBase,
        id: "non-member",
        roles: ["Mentee"],
      };
      const group: Group = {
        ...mockGroupBase,
        public: false,
        users: [{ id: "member-1", name: "Member 1", url: "member-1" }],
      };

      const result = isPermittedToAccessGroup(user, group);
      void expect(result).to.be.false;
    });
  });
});
