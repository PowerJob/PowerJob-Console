import { describe, expect, it } from 'vitest';
import { createAppRequestScope } from './appRequestScope';

describe('application-scoped asynchronous actions', () => {
  const storage = (values: Record<string, string>) => ({ getItem: (key: string) => values[key] ?? null });
  it('pins request authorization to its originating application and ignores late results after a switch', async () => {
    const values = { Power_appId: '9007199254740993', PowerJwt: 'test-session' };
    const scope = createAppRequestScope(values.Power_appId, values.PowerJwt, storage(values));
    let complete!: (id: string) => void;
    let destination: string | undefined;
    const pending = new Promise<string>(resolve => { complete = resolve; }).then(id => { if (scope.current()) destination = id; });
    values.Power_appId = '2';
    complete('9223372036854775807');
    await pending;
    expect(scope.options.headers.AppId).toBe('9007199254740993');
    expect(destination).toBeUndefined();
  });
  it('cancels pending requests on unmount and does not revive them when returning to the same app', () => {
    const values = { Power_appId: '1', PowerJwt: 'test-session' };
    const scope = createAppRequestScope('1', values.PowerJwt, storage(values));
    expect(scope.current()).toBe(true);
    scope.dispose();
    values.Power_appId = '2';
    values.Power_appId = '1';
    expect(scope.options.signal.aborted).toBe(true);
    expect(scope.current()).toBe(false);
  });
  it('ignores an old account result even if the new account uses the same application', () => {
    const values = { Power_appId: '1', PowerJwt: 'first-test-session' };
    const scope = createAppRequestScope('1', values.PowerJwt, storage(values));
    values.PowerJwt = 'second-test-session';
    expect(scope.current()).toBe(false);
    expect(createAppRequestScope('1', values.PowerJwt, storage(values)).current()).toBe(true);
  });
});
