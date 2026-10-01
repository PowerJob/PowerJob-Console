import { describe, expect, it } from 'vitest';
import { createSessionScope } from './sessionScope';

describe('session-owned requests', () => {
  it('rejects a previous identity before an old response can apply', async () => {
    let token = 'fixture-session-a';
    const scope = createSessionScope(token, { getItem: () => token });
    let release!: () => void;
    let applied = false;
    const response = new Promise<void>(resolve => { release = resolve; }).then(() => { if (scope.current()) applied = true; });
    token = 'fixture-session-b';
    release(); await response;
    expect(applied).toBe(false);
    expect(scope.current()).toBe(false);
  });

  it('aborts owned requests and remains invalid after disposal even if the same session remains', () => {
    const scope = createSessionScope('fixture-session', { getItem: () => 'fixture-session' });
    expect(scope.current()).toBe(true);
    scope.dispose();
    expect(scope.options.signal.aborted).toBe(true);
    expect(scope.current()).toBe(false);
  });
});
