import { useEffect, useMemo, type DependencyList } from 'react';
import { useConsole } from './console';
import { useQuery } from './hooks';

export function createSessionScope(token: string | null, storage: Pick<Storage, 'getItem'> = localStorage) {
  const controller = new AbortController();
  return {
    token,
    options: { signal: controller.signal },
    current: () => !controller.signal.aborted && storage.getItem('PowerJwt') === token,
    dispose: () => controller.abort(),
  };
}
export type SessionScope = ReturnType<typeof createSessionScope>;

export function useSessionScope() {
  // Subscribe to the Provider's existing storage-event synchronization.
  useConsole();
  const token = localStorage.getItem('PowerJwt');
  const scope = useMemo(() => createSessionScope(token), [token]);
  useEffect(() => () => scope.dispose(), [scope]);
  return scope;
}

export function useSessionQuery<T>(scope: SessionScope, fetcher: () => Promise<T>, deps: DependencyList = []) {
  const query = useQuery(async () => ({ scope, value: await fetcher() }), [scope, ...deps]);
  return { ...query, data: query.data?.scope === scope && scope.current() ? query.data.value : undefined };
}
