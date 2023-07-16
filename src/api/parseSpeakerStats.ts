export interface SpeakerStats {
  name: string;
  totalSpeakingSeconds: number;
}

/**
 * Given a transcript downloaded from Tencent Meeting, return speaker statistics.
 */
export function parseSpeakerStats(data: string): SpeakerStats[] {
  const speakerTimes: Map<string, number> = new Map();
  const lines = data.split('\n');
  const pattern = /^\s*(.+?)\((\d{2}):(\d{2}):(\d{2})\):/;
  
  let lastTimestamp: number | null = null;
  let lastSpeaker: string | null = null;

  for (const line of lines) {
    const match = line.match(pattern);

    if (match) {
      const speaker = match[1];
      const hours = Number(match[2]);
      const minutes = Number(match[3]);
      const seconds = Number(match[4]);

      // discard invalid timestamp
      if (minutes >= 60 || seconds >= 60) {
        continue;
      }

      const currentTimestamp = hours * 3600 + minutes * 60 + seconds;

      if (lastSpeaker && lastTimestamp !== null) {
        // discard records in wrong order
        if (currentTimestamp < lastTimestamp) {
          continue;  
        }

        const speakingTime = speakerTimes.get(lastSpeaker) || 0;
        speakerTimes.set(lastSpeaker, speakingTime + currentTimestamp - lastTimestamp);
      }

      lastSpeaker = speaker;
      lastTimestamp = currentTimestamp;
    }
    // when last speaker only shows once in whole string
     if (lastSpeaker && !speakerTimes.has(lastSpeaker)) {
      speakerTimes.set(lastSpeaker, 0);
    }
  }

  const speakerStats: SpeakerStats[] = Array.from(speakerTimes.entries()).map(([name, totalSpeakingSeconds]) => ({
    name, totalSpeakingSeconds
  }));

  return speakerStats;
}

