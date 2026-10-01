import { describe, expect, it } from 'vitest';
import { assessClock, CLOCK_STALE_MS, formatClockTime, formatServerClock, sampleServerClock, type ServerClockResponse } from './clock';

const epoch = Date.UTC(2026, 9, 2, 0, 0, 0);
const response = (serverEpoch: number, zoneOffsetHours = 8): ServerClockResponse => ({
  serverTimeTs: serverEpoch,
  serverTime: formatClockTime(serverEpoch + zoneOffsetHours * 3_600_000, true),
  serverTimeZone: 'localized display name',
});
const sample = (offsetMs = 0, roundTripMs = 200) => sampleServerClock(response(epoch + roundTripMs / 2 + offsetMs),
  { epochMs: epoch, monotonicMs: 0 }, { epochMs: epoch + roundTripMs, monotonicMs: roundTripMs })!;

describe('server and browser clock comparison', () => {
  it('compares epoch values while retaining different server civil timezones', () => {
    for (const offsetHours of [8, -7, 5.75]) {
      const reading = sampleServerClock(response(epoch + 100, offsetHours), { epochMs: epoch, monotonicMs: 0 }, { epochMs: epoch + 200, monotonicMs: 200 })!;
      const result = assessClock(reading, reading.received);
      expect(result.status).toBe('aligned');
      expect(result.offsetMs).toBe(0);
      expect(reading.serverZoneOffsetMs).toBe(offsetHours * 3_600_000);
      expect(formatServerClock(reading, result)).toBe(formatClockTime(epoch + offsetHours * 3_600_000 + 200, true));
    }
  });

  it('uses request midpoint and includes round-trip uncertainty before warning', () => {
    const reading = sample(6_000, 800);
    const result = assessClock(reading, { epochMs: epoch + 2_800, monotonicMs: 2_800 });
    expect(result).toMatchObject({ status: 'warning', offsetMs: 6_000, serverEpochMs: epoch + 8_800 });
    expect(reading.uncertaintyMs).toBe(401);
    expect(assessClock(sample(-6_000, 800), { epochMs: epoch + 800, monotonicMs: 800 })).toMatchObject({ status: 'warning', offsetMs: -6_000 });
  });

  it('does not warn when uncertainty overlaps the five-second threshold', () => {
    expect(assessClock(sample(5_100, 400), { epochMs: epoch + 400, monotonicMs: 400 })).toMatchObject({ status: 'uncertain', reason: 'threshold-overlap' });
    expect(assessClock(sample(4_000, 400), { epochMs: epoch + 400, monotonicMs: 400 }).status).toBe('aligned');
  });

  it('does not misinterpret a slow request as a confirmed clock offset', () => {
    const reading = sampleServerClock(response(epoch + 9_000), { epochMs: epoch, monotonicMs: 0 }, { epochMs: epoch + 9_000, monotonicMs: 9_000 })!;
    expect(assessClock(reading, reading.received)).toMatchObject({ status: 'uncertain', reason: 'slow-request' });
  });

  it('accepts lossless integer timestamp strings and rejects missing or invalid epochs', () => {
    const started = { epochMs: epoch, monotonicMs: 0 };
    expect(sampleServerClock({ ...response(epoch), serverTimeTs: String(epoch) }, started, started)?.serverEpochAtReceiptMs).toBe(epoch);
    for (const value of [null, undefined, '', 'not a date', Infinity, -1, 1.5, '2026-10-02', 9e15]) {
      expect(sampleServerClock({ serverTimeTs: value }, started, started)).toBeUndefined();
    }
    expect(sampleServerClock(null, started, started)).toBeUndefined();
  });

  it('marks old and failed samples explicitly and stops extrapolating the stale server time', () => {
    const reading = sample();
    const atLimit = { epochMs: reading.received.epochMs + CLOCK_STALE_MS, monotonicMs: reading.received.monotonicMs + CLOCK_STALE_MS };
    expect(assessClock(reading, atLimit).status).toBe('aligned');
    const stale = assessClock(reading, { epochMs: atLimit.epochMs + 1_000, monotonicMs: atLimit.monotonicMs + 1_000 });
    expect(stale).toMatchObject({ status: 'stale', reason: 'expired' });
    expect(formatServerClock(reading, stale)).toBe(formatClockTime(reading.serverEpochAtReceiptMs + 8 * 3_600_000, true));
    expect(assessClock(reading, reading.received, true)).toMatchObject({ status: 'stale', reason: 'request-failed' });
    expect(assessClock(undefined, reading.received, true)).toMatchObject({ status: 'missing', reason: 'request-failed' });
  });

  it('invalidates measurements during or after a local wall-clock adjustment', () => {
    const reading = sample();
    expect(assessClock(reading, { epochMs: epoch + 21_200, monotonicMs: 1_200 })).toMatchObject({ status: 'uncertain', reason: 'local-clock-changed' });
    const duringRequest = sampleServerClock(response(epoch + 100), { epochMs: epoch, monotonicMs: 0 }, { epochMs: epoch + 20_200, monotonicMs: 200 })!;
    expect(assessClock(duringRequest, duringRequest.received)).toMatchObject({ status: 'uncertain', reason: 'local-clock-changed' });
  });

  it('does not guess a timezone from a localized display name or malformed civil date', () => {
    for (const serverTime of ['2026-13-02 08:00:00', '2026-02-30 08:00:00', '2026-10-02T08:00:00Z', '', '2035-01-01 00:00:00']) {
      const reading = sampleServerClock({ ...response(epoch + 100), serverTime }, { epochMs: epoch, monotonicMs: 0 }, { epochMs: epoch + 200, monotonicMs: 200 })!;
      expect(reading.serverZoneOffsetMs).toBeUndefined();
      expect(assessClock(reading, reading.received).status).toBe('aligned');
      expect(formatServerClock(reading, assessClock(reading, reading.received))).toBe('2026-10-02 00:00:00');
    }
  });
});
