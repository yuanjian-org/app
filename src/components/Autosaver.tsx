/**
 * Reference implementation: https://www.synthace.com/blog/autosave-with-react-hooks
 */
import { useAutosaveContext } from 'AutosaveContext';
import React, { useCallback, useEffect, useMemo } from 'react';

const autosaveDelayInMs = 800;

export default function Autosaver(props: {
  data: any,
  onSave: (data: any) => Promise<void>,
}) {
  const { addPendingSaver, removePendingSaver } = useAutosaveContext();
  const id = useMemo(() => crypto.randomUUID(), []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(debounce(async (data: any) => {
    await props.onSave(data);
    removePendingSaver(id);
  }, autosaveDelayInMs), [id, props.onSave, removePendingSaver]);

  useEffect(() => {
    if (props.data) {
      addPendingSaver(id);
      debouncedSave(props.data);
    }
  }, [id, props.data, debouncedSave, addPendingSaver]);

  return null;
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