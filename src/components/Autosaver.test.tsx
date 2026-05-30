import "global-jsdom/register";
import { render, act } from "@testing-library/react";
import React from "react";
import AutosaveContext from "../AutosaveContext";
import sinon from "sinon";
import { expect } from "chai";
import crypto from "crypto";
import Autosaver from "./Autosaver";
import * as sleepModule from "../shared/sleep";

Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: () => crypto.randomUUID(),
  },
});

describe("Autosaver", () => {
  let addPendingSaver: sinon.SinonStub;
  let removePendingSaver: sinon.SinonStub;
  let setPendingSaverError: sinon.SinonStub;

  beforeEach(() => {
    addPendingSaver = sinon.stub();
    removePendingSaver = sinon.stub();
    setPendingSaverError = sinon.stub();

    sinon.stub(sleepModule, "default").resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  function renderAutosaver(props: any) {
    const defaultProps = {
      data: "initial",
      onSave: sinon.stub().resolves(),
    };

    // Define the wrapper outside to keep it stable
    const Wrapper = ({ children }: any) => (
      <AutosaveContext.Provider
        value={{
          addPendingSaver,
          removePendingSaver,
          setPendingSaverError,
        }}
      >
        {children}
      </AutosaveContext.Provider>
    );

    return render(<Autosaver {...defaultProps} {...props} />, {
      wrapper: Wrapper,
    });
  }

  it("should not save initial data", async () => {
    const onSave = sinon.stub().resolves();
    const { unmount } = renderAutosaver({ onSave, data: "initial" });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });

    expect(onSave.callCount).to.equal(0);
    expect(addPendingSaver.callCount).to.equal(0);
    unmount();
  });

  it("should save data when changed", async () => {
    const onSave = sinon.stub().resolves();
    const { rerender, unmount } = renderAutosaver({ onSave, data: "initial" });

    act(() => {
      rerender(<Autosaver onSave={onSave} data="updated" />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });

    expect(onSave.callCount).to.equal(1);
    expect(onSave.firstCall.args[0]).to.equal("updated");
    expect(removePendingSaver.callCount).to.equal(1);
    unmount();
  });

  it("should handle multiple updates correctly with debouncing", async () => {
    const onSave = sinon.stub().resolves();
    const { rerender, unmount } = renderAutosaver({ onSave, data: "initial" });

    act(() => {
      rerender(<Autosaver onSave={onSave} data="update1" />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });

    act(() => {
      rerender(<Autosaver onSave={onSave} data="update2" />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });

    expect(onSave.callCount).to.equal(1);
    expect(onSave.lastCall.args[0]).to.equal("update2");
    unmount();
  });

  it("should retry on save error", async () => {
    const onSave = sinon.stub();
    onSave.onFirstCall().rejects(new Error("save error"));
    onSave.onSecondCall().resolves();

    const { rerender, unmount } = renderAutosaver({ onSave, data: "initial" });

    act(() => {
      rerender(<Autosaver onSave={onSave} data="updated" />);
    });

    await act(async () => {
      // give it enough time to run the while loop at least twice
      await new Promise((r) => setTimeout(r, 600));
    });

    expect(onSave.callCount).to.equal(2);
    expect(setPendingSaverError.callCount).to.be.greaterThanOrEqual(1);
    unmount();
  });
});
