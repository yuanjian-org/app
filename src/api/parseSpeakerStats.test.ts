import { expect } from "chai";
import { parseSpeakerStats, SpeakerStats } from "./parseSpeakerStats";

describe("parseSpeakerStats", () => {
  it("should return empty array on random string", () => {
    const input =
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
    void expect(parseSpeakerStats(input)).to.be.an("array").that.is.empty;
  });

  it("should return empty array when name is missing", () => {
    const input = "(00:00:10): Hello!\n";
    void expect(parseSpeakerStats(input)).to.be.an("array").that.is.empty;
  });

  it("should return empty array when time is missing", () => {
    const input = "Speaker A: Hello!\n";
    void expect(parseSpeakerStats(input)).to.be.an("array").that.is.empty;
  });

  it("should return array with one element when content is missing", () => {
    const input = "Speaker A(00:00:10):\n";
    void expect(parseSpeakerStats(input)).to.deep.equal([
      { name: "Speaker A", totalSpeakingSeconds: 0 },
    ]);
  });

  it("should calculate speaking time for regular 3 line input", () => {
    const input =
      "Speaker A(00:00:10): Hello!\nSpeaker B(00:00:15): Hi!\nSpeaker A(00:00:20): How are you?\n";
    const expectedOutput: SpeakerStats[] = [
      { name: "Speaker A", totalSpeakingSeconds: 5 },
      { name: "Speaker B", totalSpeakingSeconds: 5 },
    ];
    void expect(parseSpeakerStats(input)).to.deep.equal(expectedOutput);
  });

  it("should return empty array for incorrect time format", () => {
    const input = "Speaker A(00:60:10): Hello!\n Speaker A(00:60:20): Hello!\n";
    void expect(parseSpeakerStats(input)).to.be.an("array").that.is.empty;
  });

  it("should return empty array for empty string", () => {
    const input = "";
    void expect(parseSpeakerStats(input)).to.be.an("array").that.is.empty;
  });

  it("should return array with one element for single line record", () => {
    const input = "Speaker A(00:00:10): Hello!\n";
    void expect(parseSpeakerStats(input)).to.deep.equal([
      { name: "Speaker A", totalSpeakingSeconds: 0 },
    ]);
  });

  it("should calculate speaking time for two lines record", () => {
    const input = "Speaker A(00:00:10): Hello!\nSpeaker B(00:00:15): Hi!\n";
    void expect(parseSpeakerStats(input)).to.deep.equal([
      { name: "Speaker A", totalSpeakingSeconds: 5 },
      { name: "Speaker B", totalSpeakingSeconds: 0 },
    ]);
  });

  it("should return array with one element for incomplete record", () => {
    const input = "Speaker A(00:00:10): Hello!\nSpeaker B";
    void expect(parseSpeakerStats(input)).to.deep.equal([
      { name: "Speaker A", totalSpeakingSeconds: 0 },
    ]);
  });

  it("should return empty array for incorrect format record", () => {
    const input = "Speaker A 00:00:10): Hello!\n";
    void expect(parseSpeakerStats(input)).to.be.an("array").that.is.empty;
  });

  it("should calculate speaking time for long conversation also with space before speaker name", () => {
    const input = `
    Speaker A(00:00:00): Hello everyone, welcome to the meeting.
    Speaker B(00:00:05): Hi Speaker A, nice to be here.
    Speaker A(00:00:10): Let's get started with the first topic.
    Speaker C(00:00:15): I agree with Speaker A.
    Speaker B(00:00:20): Yeah, let's go.
    Speaker A(00:00:25): First, let's talk about our sales.
    Speaker B(00:00:30): The sales in last quarter were good.
    Speaker C(00:00:35): Yes, we achieved our target.
    Speaker A(00:00:40): That's great. Now let's move on to the next topic.
    Speaker C(00:00:45): Alright.
    Speaker B(00:00:50): Let's discuss about our next quarter goals.
    Speaker A(00:00:55): Yes, we need to set our goals.
    Speaker C(00:01:00): I think we should aim for 20% increase in sales.
    Speaker B(00:01:05): That sounds like a good goal.
    Speaker A(00:01:10): Agreed. Let's all work towards this goal.
    Speaker C(00:01:15): Definitely.
    `;
    const expectedOutput: SpeakerStats[] = [
      { name: "Speaker A", totalSpeakingSeconds: 30 },
      { name: "Speaker B", totalSpeakingSeconds: 25 },
      { name: "Speaker C", totalSpeakingSeconds: 20 },
    ];
    void expect(parseSpeakerStats(input)).to.deep.equal(expectedOutput);
  });
});
