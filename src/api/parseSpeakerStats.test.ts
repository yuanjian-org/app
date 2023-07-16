import { strict as assert } from 'assert';
import { parseSpeakerStats, SpeakerStats } from './parseSpeakerStats';

function testGetSpeakerTime() {
  // 所有的测试用例...

  // total random
  const randomString = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'
  assert.deepStrictEqual(parseSpeakerStats(randomString), []);

  // 记录没有包含发言者的姓名
  const noName = '(00:00:10): Hello!\n';
  assert.deepStrictEqual(parseSpeakerStats(noName), []);

  // 记录没有包含时间
  const noTime = 'Speaker A: Hello!\n';
  assert.deepStrictEqual(parseSpeakerStats(noTime), []);

  // 记录没有包含发言内容
  const noContent = 'Speaker A(00:00:10):\n';
  assert.deepStrictEqual(parseSpeakerStats(noContent), [{ name: 'Speaker A', totalSpeakingSeconds: 0 }]);

  // regular 3 line
  const regular = 'Speaker A(00:00:10): Hello!\nSpeaker B(00:00:15): Hi!\nSpeaker A(00:00:20): How are you?\n';
  assert.deepStrictEqual(parseSpeakerStats(regular), [
    { name: 'Speaker A', totalSpeakingSeconds: 5 },
    { name: 'Speaker B', totalSpeakingSeconds: 5 }
  ]);

  // 时间是错误的格式
  const incorrectTimeFormat = 'Speaker A(00:60:10): Hello!\n Speaker A(00:60:20): Hello!\n';
  assert.deepStrictEqual(parseSpeakerStats(incorrectTimeFormat), []);

  // empty
  assert.deepStrictEqual(parseSpeakerStats(''), []);

  // 单行记录
  const singleLine = 'Speaker A(00:00:10): Hello!\n';
  assert.deepStrictEqual(parseSpeakerStats(singleLine), [{ name: 'Speaker A', totalSpeakingSeconds: 0 }]);

  // 两行记录
  const twoLines = 'Speaker A(00:00:10): Hello!\nSpeaker B(00:00:15): Hi!\n';
  assert.deepStrictEqual(parseSpeakerStats(twoLines), [
    { name: 'Speaker A', totalSpeakingSeconds: 5 },
    { name: 'Speaker B', totalSpeakingSeconds: 0 }
  ]);

  // 不完整的记录
  const incompleteRecord = 'Speaker A(00:00:10): Hello!\nSpeaker B';
  assert.deepStrictEqual(parseSpeakerStats(incompleteRecord), [{ name: 'Speaker A', totalSpeakingSeconds: 0 }]);

  // 格式错误的记录
  const incorrectFormat = 'Speaker A 00:00:10): Hello!\n';
  assert.deepStrictEqual(parseSpeakerStats(incorrectFormat), []);

  // someting like real life by ChatGPT
  const longConversation = `
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

  assert.deepStrictEqual(parseSpeakerStats(longConversation), [
    { name: 'Speaker A', totalSpeakingSeconds: 30 },
    { name: 'Speaker B', totalSpeakingSeconds: 25 },
    { name: 'Speaker C', totalSpeakingSeconds: 20 }
  ]);


  console.log('All tests passed.');
}

testGetSpeakerTime();
