import { strict as assert } from 'assert';
import { parseSpeakerStats, SpeakerStats } from './parseSpeakerStats';

function testGetSpeakerTime() {
  // 所有的测试用例...

  // 记录没有包含发言者的姓名
  const noName = '(00:00:10): Hello!\n';
  assert.deepStrictEqual(parseSpeakerStats(noName), []);

  // 记录没有包含时间
  const noTime = 'Speaker A: Hello!\n';
  assert.deepStrictEqual(parseSpeakerStats(noTime), []);

  // 记录没有包含发言内容
  const noContent = 'Speaker A(00:00:10):\n';
  assert.deepStrictEqual(parseSpeakerStats(noContent), [{ name: 'Speaker A', totalSpeakingSeconds: 0 }]);

  // regular
  const multiLine = 'Speaker A(00:00:10): Hello!\nSpeaker B(00:00:15): Hi!\nSpeaker A(00:00:20): How are you?\n';
  assert.deepStrictEqual(parseSpeakerStats(multiLine), [
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

  console.log('All tests passed.');
}

testGetSpeakerTime();
