import { useCallback, useEffect, useRef, useState } from "react";

const useBrowserQuery = <T>(initialFn: () => Promise<T>) => {
  const fnRef = useRef(initialFn);
  const [isLoading, setLoading] = useState(false);
  const [data,setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState(undefined);

  const reload = useCallback(() => {
    setLoading(true);
    fnRef.current().then(d => setData(d)).catch(e => setError(e)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, isLoading, reload }
};

export default useBrowserQuery;
