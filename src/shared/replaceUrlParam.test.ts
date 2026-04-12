import { expect } from "chai";
import sinon from "sinon";
import { NextRouter } from "next/router";
import replaceUrlParam from "./replaceUrlParam";

describe("replaceUrlParam", () => {
  it("should add a new query parameter to an existing query", async () => {
    const replaceStub = sinon.stub().resolves();
    const router = {
      pathname: "/test",
      query: { existingParam: "oldValue" },
      replace: replaceStub,
    } as unknown as NextRouter;

    await replaceUrlParam(router, "newParam", "newValue");

    expect(replaceStub.calledOnce).to.equal(true);
    expect(replaceStub.firstCall.args[0]).to.deep.equal({
      pathname: "/test",
      query: { existingParam: "oldValue", newParam: "newValue" },
    });
  });

  it("should update an existing query parameter", async () => {
    const replaceStub = sinon.stub().resolves();
    const router = {
      pathname: "/test",
      query: { targetParam: "oldValue", otherParam: "keep" },
      replace: replaceStub,
    } as unknown as NextRouter;

    await replaceUrlParam(router, "targetParam", "newValue");

    expect(replaceStub.calledOnce).to.equal(true);
    expect(replaceStub.firstCall.args[0]).to.deep.equal({
      pathname: "/test",
      query: { targetParam: "newValue", otherParam: "keep" },
    });
  });

  it("should add a query parameter when the query is empty", async () => {
    const replaceStub = sinon.stub().resolves();
    const router = {
      pathname: "/empty",
      query: {},
      replace: replaceStub,
    } as unknown as NextRouter;

    await replaceUrlParam(router, "firstParam", "123");

    expect(replaceStub.calledOnce).to.equal(true);
    expect(replaceStub.firstCall.args[0]).to.deep.equal({
      pathname: "/empty",
      query: { firstParam: "123" },
    });
  });
});
