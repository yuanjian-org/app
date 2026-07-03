import { expect } from "chai";
import { parseQueryString } from "./parseQueryString";
import { NextRouter } from "next/router";

describe("parseQueryString", () => {
  it("should return the string if the query parameter is a string", () => {
    const mockRouter = {
      query: {
        id: "123",
      },
    } as unknown as NextRouter;
    expect(parseQueryString(mockRouter, "id")).to.equal("123");
  });

  it("should return undefined if the query parameter is undefined", () => {
    const mockRouter = {
      query: {},
    } as unknown as NextRouter;
    expect(parseQueryString(mockRouter, "id")).to.equal(undefined);
  });

  it("should return undefined if the query parameter is an array of strings", () => {
    const mockRouter = {
      query: {
        id: ["123", "456"],
      },
    } as unknown as NextRouter;
    expect(parseQueryString(mockRouter, "id")).to.equal(undefined);
  });
});
