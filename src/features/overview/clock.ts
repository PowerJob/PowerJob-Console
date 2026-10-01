export const CLOCK_REFRESH_MS = 30_000;
export const CLOCK_STALE_MS = 60_000;
export const CLOCK_SKEW_WARNING_MS = 5_000;
export const CLOCK_MAX_ROUND_TRIP_MS = 4_000;
const LOCAL_CLOCK_CHANGE_MS = 250;

export interface ClockReading { epochMs: number; monotonicMs: number }
export interface ServerClockResponse {
  serverTimeTs?: unknown;
  serverTime?: unknown;
  serverTimeZone?: unknown;
  serverInfo?: { ip?: unknown; id?: unknown };
}
export interface ClockSample {
  serverEpochAtReceiptMs: number;
  serverZoneOffsetMs?: number;
  serverTimezone?: string;
  serverNode?: string;
  received: ClockReading;
  roundTripMs: number;
  uncertaintyMs: number;
  localClockChanged: boolean;
}
export type ClockStatus = 'missing' | 'stale' | 'uncertain' | 'aligned' | 'warning';
export interface ClockAssessment {
  status: ClockStatus;
  reason?: 'request-failed' | 'expired' | 'local-clock-changed' | 'slow-request' | 'threshold-overlap';
  ageMs?: number;
  offsetMs?: number;
  serverEpochMs?: number;
}

export function readClock(): ClockReading { return { epochMs: Date.now(), monotonicMs: performance.now() }; }

// The legacy response has a localized timezone display name, not an IANA zone.
// Parse its civil fields without ever treating them as the browser's timezone.
function civilTime(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year!, month! - 1, day);
  date.setUTCHours(hour!, minute, second, 0);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day
    && date.getUTCHours() === hour && date.getUTCMinutes() === minute && date.getUTCSeconds() === second ? date.getTime() : undefined;
}

export function sampleServerClock(response: ServerClockResponse | null | undefined, started: ClockReading, received: ClockReading): ClockSample | undefined {
  if (!response || typeof response !== 'object') return undefined;
  const rawEpoch = response.serverTimeTs;
  const serverEpoch = typeof rawEpoch === 'number' ? rawEpoch : typeof rawEpoch === 'string' && /^\d+$/.test(rawEpoch) ? Number(rawEpoch) : NaN;
  const roundTripMs = received.monotonicMs - started.monotonicMs;
  if (!Number.isSafeInteger(serverEpoch) || serverEpoch < 0 || serverEpoch > 8.64e15 || !Number.isFinite(roundTripMs) || roundTripMs < 0
    || !Number.isFinite(started.epochMs) || !Number.isFinite(received.epochMs)) return undefined;
  const civilEpoch = civilTime(response.serverTime);
  // serverTime is truncated to seconds and captured immediately before serverTimeTs.
  // Rounding to a minute recovers the actual civil offset without an English-name map.
  const zoneOffset = civilEpoch === undefined ? undefined : Math.round((civilEpoch - serverEpoch) / 60_000) * 60_000;
  const serverZoneOffsetMs = zoneOffset !== undefined && Math.abs(zoneOffset) <= 14 * 3_600_000
    && Math.abs(civilEpoch! - serverEpoch - zoneOffset) <= 1_500 ? zoneOffset : undefined;
  return {
    serverEpochAtReceiptMs: serverEpoch + roundTripMs / 2,
    serverZoneOffsetMs,
    serverTimezone: typeof response.serverTimeZone === 'string' ? response.serverTimeZone : undefined,
    serverNode: typeof response.serverInfo?.ip === 'string' ? response.serverInfo.ip : undefined,
    received,
    roundTripMs,
    uncertaintyMs: roundTripMs / 2 + 1,
    localClockChanged: Math.abs(received.epochMs - started.epochMs - roundTripMs) > LOCAL_CLOCK_CHANGE_MS,
  };
}

export function assessClock(sample: ClockSample | undefined, now: ClockReading, requestFailed = false): ClockAssessment {
  if (!sample) return { status: 'missing', reason: requestFailed ? 'request-failed' : undefined };
  const ageMs = now.monotonicMs - sample.received.monotonicMs;
  if (requestFailed) return { status: 'stale', reason: 'request-failed', ageMs };
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > CLOCK_STALE_MS) return { status: 'stale', reason: 'expired', ageMs };
  const serverEpochMs = sample.serverEpochAtReceiptMs + ageMs;
  const offsetMs = serverEpochMs - now.epochMs;
  const result = { ageMs, serverEpochMs, offsetMs };
  if (sample.localClockChanged || Math.abs(now.epochMs - sample.received.epochMs - ageMs) > LOCAL_CLOCK_CHANGE_MS) {
    return { ...result, status: 'uncertain', reason: 'local-clock-changed' };
  }
  if (sample.roundTripMs > CLOCK_MAX_ROUND_TRIP_MS) return { ...result, status: 'uncertain', reason: 'slow-request' };
  const magnitude = Math.abs(offsetMs);
  if (magnitude - sample.uncertaintyMs > CLOCK_SKEW_WARNING_MS) return { ...result, status: 'warning' };
  if (magnitude + sample.uncertaintyMs > CLOCK_SKEW_WARNING_MS) return { ...result, status: 'uncertain', reason: 'threshold-overlap' };
  return { ...result, status: 'aligned' };
}

export function formatClockTime(epochMs: number, utc = false): string {
  const date = new Date(epochMs);
  if (!Number.isFinite(date.getTime())) return '—';
  const parts = utc
    ? [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()]
    : [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()];
  const [year, month, day, hour, minute, second] = parts.map(value => String(value).padStart(2, '0'));
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export function formatServerClock(sample: ClockSample, assessment: ClockAssessment): string {
  // Stale readings stay visibly at the last sample instead of pretending to be live.
  const epochMs = assessment.status === 'stale' ? sample.serverEpochAtReceiptMs : assessment.serverEpochMs ?? sample.serverEpochAtReceiptMs;
  return formatClockTime(epochMs + (sample.serverZoneOffsetMs ?? 0), true);
}

export function formatUtcOffset(offsetMs: number): string {
  const minutes = Math.round(Math.abs(offsetMs) / 60_000);
  return `UTC${offsetMs < 0 ? '-' : '+'}${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
