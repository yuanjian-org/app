import { expect } from "chai";
import { isTraitsComplete, Traits } from "./Traits";

describe("isTraitsComplete", () => {
  it("should return false when traits is undefined", () => {
    void expect(isTraitsComplete(undefined)).to.be.false;
  });

  it("should return false when traits is an empty object", () => {
    const traits = {} as Traits;
    void expect(isTraitsComplete(traits)).to.be.false;
  });

  it("should return false when traits is a partial object", () => {
    const traits = {
      农村vs城市: 1,
      内敛vs外向: -1,
    } as Traits;
    void expect(isTraitsComplete(traits)).to.be.false;
  });

  it("should return true when traits is a complete object without 其他", () => {
    const traits: Traits = {
      农村vs城市: 1,
      内敛vs外向: -1,
      慢热vs快热: 0,
      安逸vs奋斗: 2,
      顺从vs独立: -2,
      思考者vs实干家: 1,
      创业vs大厂: -1,
      科研vs非科研: 0,
    };
    void expect(isTraitsComplete(traits)).to.be.true;
  });

  it("should return true when traits is a complete object with 其他", () => {
    const traits: Traits = {
      农村vs城市: 1,
      内敛vs外向: -1,
      慢热vs快热: 0,
      安逸vs奋斗: 2,
      顺从vs独立: -2,
      思考者vs实干家: 1,
      创业vs大厂: -1,
      科研vs非科研: 0,
      其他: "some string",
    };
    void expect(isTraitsComplete(traits)).to.be.true;
  });
});
