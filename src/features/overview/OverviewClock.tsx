import { useEffect, useRef } from 'react';
import { CircleCheck, Clock3, TriangleAlert } from 'lucide-react';
import { useConsole } from '../../lib/console';
import { compareTimezones, formatClockTime, formatServerClock, formatUtcOffset } from './clock';
import { useOverviewClock } from './useOverviewClock';
import './clock.css';

export function OverviewClock({ appId, refreshKey }: { appId: string; refreshKey: number }) {
  const { t } = useConsole();
  const clock = useOverviewClock(appId);
  const previousRefresh = useRef(refreshKey);
  useEffect(() => {
    if (previousRefresh.current !== refreshKey) { previousRefresh.current = refreshKey; void clock.refresh(); }
  }, [refreshKey, clock.refresh]);
  const { now, sample, assessment, loading, error } = clock;
  const { status, reason, offsetMs } = assessment;
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || t('本地时区', 'Local timezone');
  const timezone = compareTimezones(sample?.serverZoneOffsetMs, new Date(now.epochMs).getTimezoneOffset());
  const localUtcOffset = timezone.localOffsetMs !== undefined ? formatUtcOffset(timezone.localOffsetMs) : t('UTC 偏移不可用', 'UTC offset unavailable');
  const timezoneDiffers = timezone.differenceMs !== undefined && timezone.differenceMs !== 0;
  const seconds = Math.abs((offsetMs ?? 0) / 1_000).toFixed(1);
  const uncertainty = sample ? (sample.uncertaintyMs / 1_000).toFixed(1) : '—';
  const statusText = status === 'missing'
    ? loading ? t('正在读取服务器时间…', 'Reading server time…') : error ? t('校时失败，无法判断时钟偏差', 'Clock check failed; clock offset is unavailable') : t('服务器未返回有效时间，无法判断时钟偏差', 'No valid server time; clock offset is unavailable')
    : status === 'stale' ? reason === 'request-failed' ? t('校时失败，显示上次读取时间', 'Clock check failed; showing the last reading') : t('服务器时间已过期，请刷新校时', 'Server time is stale; refresh to check the clocks')
    : reason === 'local-clock-changed' ? t('本地时间已调整，正在重新校时', 'Local time changed; checking the clocks again')
    : reason === 'slow-request' ? t('网络延迟较高，无法确认时钟偏差', 'Network delay is high; clock offset is uncertain')
    : reason === 'threshold-overlap' ? t('时钟偏差接近 5 秒，暂无法确认偏差', 'Clock offset is near 5 seconds; the offset is uncertain')
    : status === 'warning' ? offsetMs! > 0 ? t(`服务器比本地快约 ${seconds} 秒，请检查时钟同步`, `Server is approximately ${seconds}s ahead; check clock synchronization`) : t(`服务器比本地慢约 ${seconds} 秒，请检查时钟同步`, `Server is approximately ${seconds}s behind; check clock synchronization`)
    : t(`时钟偏差约 ${seconds} 秒`, `Clock offset is approximately ${seconds}s`);
  const Icon = status === 'warning' ? TriangleAlert : status === 'aligned' ? CircleCheck : Clock3;
  const serverTimezone = sample?.serverZoneOffsetMs !== undefined ? `${sample.serverTimezone ? sample.serverTimezone + ' · ' : ''}${formatUtcOffset(sample.serverZoneOffsetMs)}` : t('UTC · 服务器时区信息不可用', 'UTC · Server timezone unavailable');
  return <section className="overview-time-panel" aria-label={t('服务器与本地时间', 'Server and local time')}>
    <div className="overview-time-pair">
      <div><span>{t('服务器时间', 'Server time')}{status === 'stale' && <em>{t('上次读取', 'Last reading')}</em>}</span><strong>{sample ? formatServerClock(sample, assessment) : '—'}</strong><small>{sample ? serverTimezone : '—'}{sample?.serverNode ? ` · ${sample.serverNode}` : ''}</small></div>
      <div><span>{t('本地时间', 'Local time')}</span><strong>{formatClockTime(now.epochMs)}</strong><small>{browserTimezone} · {localUtcOffset}</small></div>
    </div>
    <p className={`overview-time-status overview-time-${status}`} role="status"><Icon size={14} aria-hidden="true"/><span>{statusText}</span></p>
    {status === 'warning' && <small className="overview-time-warning-help">{t('时间差可能影响调度时间的设置与判断，请检查设备和服务器时钟。', 'The difference may affect schedule settings and interpretation. Check the device and server clocks.')}</small>}
    {timezoneDiffers && <p className="overview-time-status overview-time-timezone-difference" role="status"><TriangleAlert size={14} aria-hidden="true"/><span>{status === 'stale'
      ? t(`上次读取的服务器时区与本地时区不同（服务器 ${formatUtcOffset(sample!.serverZoneOffsetMs!)}；本地 ${localUtcOffset}），设置调度时间时请核对服务器时区，避免在错误时间触发。`, `The last-read server timezone differs from local time (server ${formatUtcOffset(sample!.serverZoneOffsetMs!)}; local ${localUtcOffset}). Check the server timezone when setting schedules to avoid triggering at the wrong time.`)
      : t(`服务器与本地时区不同（服务器 ${formatUtcOffset(sample!.serverZoneOffsetMs!)}；本地 ${localUtcOffset}），设置调度时间时请核对服务器时区，避免在错误时间触发。`, `Server and local timezones differ (server ${formatUtcOffset(sample!.serverZoneOffsetMs!)}; local ${localUtcOffset}). Check the server timezone when setting schedules to avoid triggering at the wrong time.`)}</span></p>}
    <small className="overview-time-note">{t('每 30 秒校时 · 偏差超过 5 秒时提醒', 'Checked every 30s · Warns for offsets over 5s')}{sample && <> · {t('往返', 'Round trip')} {Math.round(sample.roundTripMs)} ms · ±{uncertainty}s</>}</small>
  </section>;
}
