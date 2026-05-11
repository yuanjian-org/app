import { expect } from "chai";
import sinon from "sinon";
import { Transaction } from "sequelize";
import sequelize from "../../database/sequelize";
import { submit } from "./index";
import * as applicationModule from "./application";
import * as uploadModule from "./upload";
import * as examModule from "./exam";
import { TRPCError } from "@trpc/server";

describe("jinshuju webhook index", () => {
  let transaction: Transaction;
  let submitMenteeAppStub: sinon.SinonStub;
  let submitVolunteerAppStub: sinon.SinonStub;
  let submitUploadStub: sinon.SinonStub;
  let submitExamStub: sinon.SinonStub;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    submitMenteeAppStub = sinon.stub(applicationModule, "submitMenteeApp").resolves();
    submitVolunteerAppStub = sinon.stub(applicationModule, "submitVolunteerApp").resolves();
    submitUploadStub = sinon.stub(uploadModule, "default").resolves();
    submitExamStub = sinon.stub(examModule, "default").resolves();
  });

  afterEach(async () => {
    sinon.restore();
    await transaction.rollback();
  });

  it("should route MenteeApp forms", async () => {
    const entry = { data: "test-mentee-app" };

    await submit({ form: "FBTWTe", entry }, transaction);
    expect(submitMenteeAppStub.callCount).to.equal(1);
    expect(submitMenteeAppStub.firstCall.args).to.deep.equal(["FBTWTe", entry, transaction]);

    await submit({ form: "S74k0V", entry }, transaction);
    expect(submitMenteeAppStub.callCount).to.equal(2);
    expect(submitMenteeAppStub.secondCall.args).to.deep.equal(["S74k0V", entry, transaction]);

    await submit({ form: "Z82u8w", entry }, transaction);
    expect(submitMenteeAppStub.callCount).to.equal(3);
    expect(submitMenteeAppStub.thirdCall.args).to.deep.equal(["Z82u8w", entry, transaction]);
  });

  it("should route VolunteerApp forms", async () => {
    const entry = { data: "test-volunteer-app" };

    await submit({ form: "OzuvWD", entry }, transaction);
    expect(submitVolunteerAppStub.callCount).to.equal(1);
    expect(submitVolunteerAppStub.firstCall.args).to.deep.equal([entry, transaction]);
  });

  it("should route upload forms", async () => {
    const entry = { data: "test-upload" };

    await submit({ form: "Bz3uSO", entry }, transaction);
    expect(submitUploadStub.callCount).to.equal(1);
    expect(submitUploadStub.firstCall.args).to.deep.equal([entry]);

    await submit({ form: "nhFsf1", entry }, transaction);
    expect(submitUploadStub.callCount).to.equal(2);
    expect(submitUploadStub.secondCall.args).to.deep.equal([entry]);
  });

  it("should route interview exam form", async () => {
    const entry = { data: "test-interview-exam" };

    await submit({ form: "w02l95", entry }, transaction);
    expect(submitExamStub.callCount).to.equal(1);
    expect(submitExamStub.firstCall.args).to.deep.equal([entry, "menteeInterviewerExam", 110, transaction]);
  });

  it("should route handbook exam form", async () => {
    const entry = { data: "test-handbook-exam" };

    await submit({ form: "wqPdKE", entry }, transaction);
    expect(submitExamStub.callCount).to.equal(1);
    expect(submitExamStub.firstCall.args).to.deep.equal([entry, "handbookExam", 100, transaction]);
  });

  it("should route comms exam form", async () => {
    const entry = { data: "test-comms-exam" };

    await submit({ form: "nsnx4G", entry }, transaction);
    expect(submitExamStub.callCount).to.equal(1);
    expect(submitExamStub.firstCall.args).to.deep.equal([entry, "commsExam", 115, transaction]);
  });

  it("should throw BAD_REQUEST on unknown form id", async () => {
    let error: any;
    try {
      await submit({ form: "UnknownFormId", entry: {} }, transaction);
    } catch (e) {
      error = e;
    }

    expect(error).to.exist;
    expect(error).to.be.instanceOf(TRPCError);
    expect(error.code).to.equal("BAD_REQUEST");
    expect(error.message).to.include("UnknownFormId");
  });
});
