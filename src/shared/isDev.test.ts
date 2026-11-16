import { expect } from "chai";
import sinon from "sinon";
import { isDev } from "./isDev";

describe("isDev", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("returns true when NODE_ENV is development", () => {
    sinon.stub(process, "env").value({
      ...process.env,
      NODE_ENV: "development",
    });
    void expect(isDev()).to.be.true;
  });

  it("returns false when NODE_ENV is production", () => {
    sinon.stub(process, "env").value({
      ...process.env,
      NODE_ENV: "production",
    });
    void expect(isDev()).to.be.false;
  });

  it("returns false when NODE_ENV is undefined", () => {
    sinon.stub(process, "env").value({
      ...process.env,
      NODE_ENV: undefined,
    });
    void expect(isDev()).to.be.false;
  });
});
