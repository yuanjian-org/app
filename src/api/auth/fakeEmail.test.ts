import { expect } from "chai";
import {
  unionId2Email,
  email2UnionId,
  ssoUserId2Email,
  email2SsoUserId,
} from "./fakeEmail";

describe("fakeEmail utils", () => {
  it("unionId2Email and email2UnionId should be reversible", () => {
    const original = "oUpF8uMuAJO_M2pxb1Q9zNjWeS6o";
    const email = unionId2Email(original);
    expect(email).to.equal("o+up+f8u+mu+a+j+o_+m2pxb1+q9z+nj+we+s6o@wechat.fe");
    const reversed = email2UnionId(email);
    expect(reversed).to.equal(original);
  });

  it("ssoUserId2Email and email2SsoUserId should be reversible", () => {
    const original = "ssoUserId123ABC";
    const email = ssoUserId2Email(original);
    expect(email).to.equal("sso+user+id123+a+b+c@sso.fe");
    const reversed = email2SsoUserId(email);
    expect(reversed).to.equal(original);
  });

  it("unionId2Email throws on invalid input", () => {
    expect(() => unionId2Email("inv+alid")).to.throw();
    expect(() => unionId2Email("")).to.throw();
  });

  it("ssoUserId2Email throws on invalid input", () => {
    expect(() => ssoUserId2Email("inv+alid")).to.throw();
    expect(() => ssoUserId2Email("")).to.throw();
  });
});
