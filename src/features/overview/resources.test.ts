import { describe, expect, it } from 'vitest';
import { resourcePercent } from './resources';

describe('WorkerStatusVO resource display', () => {
  it('uses the actual CPU core count for load instead of treating load as a fraction', () => {
    expect(resourcePercent('0.9 / 8 cores')).toBeCloseTo(11.25);
    expect(resourcePercent('7.2 / 8 cores')).toBeCloseTo(90);
    expect(resourcePercent('0 / 16 cores')).toBe(0);
  });
  it('reads the already calculated memory and disk percentages without reinterpreting their GB values', () => {
    expect(resourcePercent('27.7%（2.9 / 8.0 GB）')).toBe(27.7);
    expect(resourcePercent('1%（2 / 200 GB）')).toBe(1);
    expect(resourcePercent('90%（900 / 1,000 GB）')).toBe(90);
  });
  it('handles grouped CPU counts and clamps overload for progress rendering', () => {
    expect(resourcePercent('1,024.5 / 2,048 cores')).toBeCloseTo(50.024414);
    expect(resourcePercent('12 / 8 cores')).toBe(100);
  });
  it('respects Server locales with a decimal comma or localized grouping', () => {
    expect(resourcePercent('27,7%（2,9 / 8 GB）')).toBe(27.7);
    expect(resourcePercent('0,9 / 8 cores')).toBeCloseTo(11.25);
    expect(resourcePercent('1.024 / 2048 cores')).toBe(50);
    expect(resourcePercent('1\u202f024,5 / 2048 cores')).toBeCloseTo(50.024414);
  });
  it('does not invent a percentage for unknown or invalid metrics', () => {
    for (const value of [null, undefined, '', 'N/A', '0 / 0 cores', '8 cores', 'invalid', 0.9]) expect(resourcePercent(value)).toBeUndefined();
  });
});
