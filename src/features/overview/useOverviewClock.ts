import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { useQuery } from '../../lib/hooks';
import { assessClock, CLOCK_REFRESH_MS, readClock, sampleServerClock, type ServerClockResponse } from './clock';

export function useOverviewClock(appId: string) {
  const [now, setNow] = useState(readClock);
  const query = useQuery(async () => {
    const scope = appId;
    const started = readClock();
    const response = await api.get<ServerClockResponse>('/server/hello', undefined, { quiet: true, headers: { 'Cache-Control': 'no-cache', AppId: scope } });
    const received = readClock();
    return { scope, sample: sampleServerClock(response, started, received) };
  }, [appId]);
  const sample = query.data?.scope === appId ? query.data.sample : undefined;
  const current = sample && now.monotonicMs < sample.received.monotonicMs ? sample.received : now;
  const assessment = assessClock(sample, current, Boolean(query.error));
  const resampledClockChange = useRef<number | undefined>(undefined);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(readClock()), 1_000);
    const poll = window.setInterval(() => { if (document.visibilityState !== 'hidden') void query.refresh(); }, CLOCK_REFRESH_MS);
    const visible = () => { if (document.visibilityState !== 'hidden') { setNow(readClock()); void query.refresh(); } };
    document.addEventListener('visibilitychange', visible);
    return () => { window.clearInterval(tick); window.clearInterval(poll); document.removeEventListener('visibilitychange', visible); };
  }, [appId, query.refresh]);

  useEffect(() => {
    if (assessment.reason === 'local-clock-changed' && !query.loading && sample
      && resampledClockChange.current !== sample.received.monotonicMs) {
      resampledClockChange.current = sample.received.monotonicMs;
      void query.refresh();
    }
  }, [assessment.reason, query.loading, query.refresh, sample]);

  return { now: current, sample, assessment, loading: query.loading, error: query.error, refresh: query.refresh };
}
