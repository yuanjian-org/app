import { useAutosaveContext } from 'AutosaveContext';
import React, { useCallback, useEffect, useMemo } from 'react';
import sleep from 'shared/sleep';

const autosaveDelayMs = 800;
const retryIntervalSec = 8;

/**
 * Reference implementation: https://www.synthace.com/blog/autosave-with-react-hooks
 */
export default function Autosaver(props: {
  data: any,
  onSave: (data: any) => Promise<void>,
}) {
  const { addPendingSaver, removePendingSaver, setPendingSaverError } = useAutosaveContext();
  const memo = useMemo(() => ({ 
    id: crypto.randomUUID(),
    data: null,
    saving: false,
  }), []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(debounce(async () => {
    memo.saving = true;
    try {
      while (memo.data) {
        const data = memo.data;
        memo.data = null;
        console.debug("Autosaver: Savinging data.");
        await saveWithRetry(props.onSave, data, (e) => setPendingSaverError(memo.id, e));
      }
    } finally {
      memo.saving = false;
    }
    console.debug("Autosaver: Done all savingings.");
    removePendingSaver(memo.id);
}, autosaveDelayMs), [memo, props.onSave, removePendingSaver]);

  // This block is triggered whenever props.data changes.
  useEffect(() => {
    if (props.data == null || props.data == undefined) return;
    // Discard previously queued data.
    memo.data = props.data;
    if (memo.saving) {
      console.debug("Autosaver: Enqueue data only.");
    } else {
      console.debug("Autosaver: Enqueue data and schedule savinging.");
      debouncedSave();
    }
    addPendingSaver(memo.id);
  }, [memo, props.data, addPendingSaver, debouncedSave]);

  return null;
}

async function saveWithRetry(
  save: (data: any) => Promise<void>, 
  data: any, 
  setError: (e?: any) => void,
) {
  while (true) {
    try {
      await save(data);
      setError();
      break;
    } catch (e) {
      console.error(`Autosaver: error during saving. retry in ${retryIntervalSec} secs:`, e);
      setError(`保存失败。自动重试中：${e}`);
      await sleep(retryIntervalSec * 1000);
    }
  }
}

function debounce(func: Function, delayInMs: number): Function {
  let timeout: any;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(null, args);
    }, delayInMs);
  };
}
