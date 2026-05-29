import { useAutosaveContext } from "AutosaveContext";
import { useEffect, useMemo, useRef, useState } from "react";
import sleep from "shared/sleep";
import _ from "lodash";

const autosaveDelayMs = 500;
const retryIntervalSec = 8;

export default function Autosaver<T>({
  data,
  onSave,
}: {
  data: T;
  onSave: (data: T) => Promise<void>;
}) {
  const { addPendingSaver, removePendingSaver, setPendingSaverError } =
    useAutosaveContext();

  const latestRef = useRef({
    onSave,
    removePendingSaver,
    setPendingSaverError,
  });
  latestRef.current = { onSave, removePendingSaver, setPendingSaverError };

  const [initialData] = useState(data);
  const memo = useMemo(
    () => ({
      id: crypto.randomUUID(),
      pendingData: null as T | null,
      lastSavedData: initialData,
      saving: false,
    }),
    [initialData],
  );

  const debouncedSave = useMemo(
    () =>
      _.debounce(async () => {
        memo.saving = true;
        try {
          while (memo.pendingData !== null) {
            const data = memo.pendingData;
            memo.pendingData = null;
            console.debug(`Autosaver ${memo.id}: Saving data.`);
            await saveWithRetry(latestRef.current.onSave, data, (e) =>
              latestRef.current.setPendingSaverError(memo.id, e),
            );
            memo.lastSavedData = data;
          }
        } finally {
          memo.saving = false;
        }
        console.debug(`Autosaver ${memo.id}: Done all savings.`);
        latestRef.current.removePendingSaver(memo.id);
      }, autosaveDelayMs),
    [memo],
  );

  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  useEffect(() => {
    if (_.isEqual(memo.lastSavedData, data)) return;
    // Discard previously queued data.
    memo.pendingData = data;
    if (memo.saving) {
      console.debug(`Autosaver ${memo.id}: Enqueue data only.`);
    } else {
      console.debug(`Autosaver ${memo.id}: Enqueue data and schedule saving.`);
      // Explicitly mark promise as ignored to satisfy @typescript-eslint/no-floating-promises
      void debouncedSave();
    }
    addPendingSaver(memo.id);
  }, [memo, data, addPendingSaver, debouncedSave]);

  return null;
}

async function saveWithRetry<T>(
  save: (data: T) => Promise<void>,
  data: T,
  setError: (e?: any) => void,
) {
  while (true) {
    try {
      await save(data);
      setError();
      break;
    } catch (e) {
      console.error(
        `Autosaver: error during saving. retry in ` +
          `${retryIntervalSec} secs:`,
        e,
      );
      setError(`保存失败，自动重试中。`);
      await sleep(retryIntervalSec * 1000);
    }
  }
}
