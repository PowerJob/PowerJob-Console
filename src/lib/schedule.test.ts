import { describe, expect, it } from 'vitest';
import { schedulePreview } from './schedule';

describe('legacy schedule validation responses', () => {
  it('shows real trigger dates as a list', () => {
    const dates = ['2026-10-02 12:00:00', '2026-10-02 12:05:00'];
    expect(schedulePreview(dates)).toEqual({ times: dates });
  });
  it('shows cron and lifecycle errors as errors despite the successful DTO', () => {
    for (const message of ['IllegalArgumentException: Invalid cron expression', 'lifecycle is out of date!']) expect(schedulePreview([message])).toEqual({ times: [], error: message });
  });
  it('keeps the server no-trigger success tip informational', () => {
    const message = 'It is valid, but has not trigger time list!';
    expect(schedulePreview([message])).toEqual({ times: [], message });
  });
  it('rejects malformed responses and refuses partial date lists containing errors', () => {
    expect(schedulePreview({ error: 'bad' }).error).toBeTruthy();
    expect(schedulePreview(['2026-10-02 12:00:00', 'Unsupported schedule'])).toEqual({ times: [], error: 'Unsupported schedule' });
  });
});
