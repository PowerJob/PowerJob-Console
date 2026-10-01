import { describe, expect, it } from 'vitest';
import { nextLogPage } from './logFollow';

describe('live log page following', () => {
  it('opens a fresh viewer at the latest page, including empty logs', () => {
    expect(nextLogPage(0, undefined, 22, true)).toBe(21);
    expect(nextLogPage(0, undefined, 0, true)).toBe(0);
  });
  it('crosses a new page boundary while following the previous last page', () => {
    expect(nextLogPage(0, 1, 2, true)).toBe(1);
    expect(nextLogPage(21, 22, 30, true)).toBe(29);
    expect(nextLogPage(29, 30, 30, true)).toBe(29);
  });
  it('keeps a manually selected historical page even when following is otherwise enabled', () => {
    expect(nextLogPage(0, 22, 30, true)).toBe(0);
    expect(nextLogPage(10, 22, 30, false)).toBe(10);
  });
  it('preserves the last page when a reader scrolls upward during an in-flight refresh', () => {
    expect(nextLogPage(21, 22, 30, false)).toBe(21);
    expect(nextLogPage(0, undefined, 22, false)).toBe(0);
  });
  it('clamps an unavailable page after retry clears old output', () => {
    expect(nextLogPage(21, 22, 1, false)).toBe(0);
    expect(nextLogPage(21, 22, 0, true)).toBe(0);
  });
});
