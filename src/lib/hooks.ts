import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
export function useQuery<T>(fetcher: () => Promise<T>, deps: DependencyList = []) {
  const [data, setData] = useState<T>(); const [loading, setLoading] = useState(true); const [error, setError] = useState<Error>(); const sequence = useRef(0); const current = useRef(fetcher); current.current = fetcher;
  const refresh = useCallback(async () => { const generation = ++sequence.current; setLoading(true); setError(undefined); try { const result = await current.current(); if (generation === sequence.current) setData(result); return result; } catch (e) { if (generation === sequence.current) setError(e as Error); return undefined; } finally { if (generation === sequence.current) setLoading(false); } }, []);
  useEffect(() => { setData(undefined); void refresh(); return () => { ++sequence.current; }; }, [...deps, refresh]);
  return { data, loading, error, refresh, setData };
}
