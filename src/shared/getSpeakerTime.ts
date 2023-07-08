import fs from 'fs';

interface Speaker {
  name: string;
  totalSpeakingSeconds: number;
}

export function getSpeakerTime(filePath: string): Promise<Speaker[]> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        const speakerTimes: Map<string, number> = new Map();
        const lines = data.split('\n');
        const pattern = /^(.+?)\((\d{2}):(\d{2}):(\d{2})\):/;
        
        let lastTimestamp: number | null = null;
        let lastSpeaker: string | null = null;

        for (const line of lines) {
          const match = line.match(pattern);

          if (match) {
            const speaker = match[1];
            const hours = Number(match[2]);
            const minutes = Number(match[3]);
            const seconds = Number(match[4]);

            const currentTimestamp = hours * 3600 + minutes * 60 + seconds;

            if (lastSpeaker && lastTimestamp !== null) {
              const speakingTime = speakerTimes.get(lastSpeaker) || 0;
              speakerTimes.set(lastSpeaker, speakingTime + currentTimestamp - lastTimestamp);
            }

            lastSpeaker = speaker;
            lastTimestamp = currentTimestamp;
          }
        }

        const speakerStats: Speaker[] = Array.from(speakerTimes.entries()).map(([name, totalSpeakingSeconds]) => ({
          name, totalSpeakingSeconds
        }));

        resolve(speakerStats);
      }
    });
  });
}

