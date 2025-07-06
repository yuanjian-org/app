import { expect } from "chai";
import formatMeetingMinutes from "./formatMeetingMinutes";

describe("formatMeetingMinutes", () => {
  it("should produce expected output", () => {
    const input = `会议摘要

研究生毕业准备与实验室生活分享
这段内容主要讲述了一个人在实验室忙碌的生活。

植物实验室工作者的辛劳与压力
主要讲述了同学面临的压力和疲惫。

会议待办

· 了解并了解其他实验室的薪资发放情况
· 积累精神财富以备将来使用`;

    const expeted = `### 会议待办


* 了解并了解其他实验室的薪资发放情况
* 积累精神财富以备将来使用


### 会议摘要


**研究生毕业准备与实验室生活分享**

这段内容主要讲述了一个人在实验室忙碌的生活。


**植物实验室工作者的辛劳与压力**

主要讲述了同学面临的压力和疲惫。`;

    expect(formatMeetingMinutes(input)).is.equal(expeted);
  });

  it("should allow missing todos", () => {
    const input = `会议摘要

研究生毕业准备与实验室生活分享
这段内容主要讲述了一个人在实验室忙碌的生活。`;

    const expeted = `### 会议摘要


**研究生毕业准备与实验室生活分享**

这段内容主要讲述了一个人在实验室忙碌的生活。`;

    expect(formatMeetingMinutes(input)).is.equal(expeted);
  });
});
