/**
 * Reference implementation: https://www.synthace.com/blog/autosave-with-react-hooks
 */
import React, { useCallback, useEffect } from 'react';

const autosaveDelayInMs = 1000;

export default function Autosave(props: {
  data: any,
  onSave: (data: any) => void,
}) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(debounce(async (newData: any) => {
    props.onSave(newData);
  }, autosaveDelayInMs), []);

  useEffect(() => {
    if (props.data) {
      debouncedSave(props.data);
    }
  }, [props.data, debouncedSave]);

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