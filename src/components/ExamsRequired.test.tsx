import "jsdom-global/register";
import React from "react";
import { render } from "@testing-library/react";
import { expect } from "chai";
import { ExamsRequired } from "./ExamsRequired";

describe("ExamsRequired component", () => {
  let originalConsoleError: any;

  before(() => {
    originalConsoleError = console.error;
    console.error = () => {}; // suppress React's invariant error logging
  });

  after(() => {
    console.error = originalConsoleError;
  });

  it("throws an error if no exam is required", () => {
    expect(() => render(<ExamsRequired />)).to.throw("需要完成评测");
  });

  it("renders comms exam link correctly", () => {
    const { getByText } = render(<ExamsRequired commsExamRequired={true} />);
    expect(getByText("《学生通信原则》自学与评测")).not.to.equal(null);
    expect(getByText(/即可看到面试信息/)).not.to.equal(null);
    expect(getByText(/面试官/)).not.to.equal(null);
  });

  it("renders interview exam link correctly", () => {
    const { getByText } = render(
      <ExamsRequired interviewExamRequired={true} />,
    );
    expect(getByText("面试官自学与评测")).not.to.equal(null);
  });

  it("renders handbook exam link correctly", () => {
    const { getByText } = render(<ExamsRequired handbookExamRequired={true} />);
    expect(getByText("《社会导师手册》自学与评测")).not.to.equal(null);
  });

  it("renders multiple exam links separated correctly", () => {
    const { container } = render(
      <ExamsRequired commsExamRequired={true} interviewExamRequired={true} />,
    );
    expect(container.textContent).to.include("以及");
  });

  it("renders custom actionText and roleText", () => {
    const { getByText } = render(
      <ExamsRequired
        commsExamRequired={true}
        actionText="即可参与"
        roleText="测试用户"
      />,
    );
    expect(getByText(/即可参与/)).not.to.equal(null);
    expect(getByText(/我们邀请测试用户每年/)).not.to.equal(null);
  });

  it("renders interview specific paragraph if interview exam is required", () => {
    const { getByText } = render(
      <ExamsRequired interviewExamRequired={true} />,
    );
    expect(getByText(/导师面试与学生面试的原则一致/)).not.to.equal(null);
  });

  it("does not render interview specific paragraph if interview exam is not required", () => {
    const { queryByText } = render(
      <ExamsRequired commsExamRequired={true} interviewExamRequired={false} />,
    );
    expect(queryByText(/导师面试与学生面试的原则一致/)).to.equal(null);
  });
});
