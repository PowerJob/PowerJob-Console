import { describe, expect, it } from 'vitest';
import { RequestScope } from './requestScope';
import { createSessionScope } from '../../lib/sessionScope';

describe('application and dialog response isolation', () => {
  it('invalidates a late response even after switching back to the original application', () => {
    const scope = new RequestScope('app-1'); const original = scope.capture();
    scope.update('app-2'); expect(scope.current(original)).toBe(false);
    scope.update('app-1'); expect(scope.current(original)).toBe(false);
    const current = scope.capture(); scope.update('app-1'); expect(scope.current(current)).toBe(true);
  });
  it('discards a previous window response after closing or replacing that window', () => {
    const scope = new RequestScope('app-1'); const request = scope.capture();
    scope.invalidate(); expect(scope.current(request)).toBe(false);
    const replacement = scope.capture(); expect(scope.current(replacement)).toBe(true);
  });
  it('invalidates a same-application operation as soon as the login token changes', () => {
    let token = 'original'; const storage = { getItem: () => token }; const session = createSessionScope(token, storage);
    const scope = new RequestScope('app-1', session); const operation = scope.capture(); expect(scope.current(operation)).toBe(true);
    token = 'replacement'; expect(scope.current(operation)).toBe(false);
    scope.update('app-1', createSessionScope(token, storage)); expect(scope.current(operation)).toBe(false);
    const replacement = scope.capture(); expect(scope.current(replacement)).toBe(true);
    token = 'original'; scope.update('app-1', createSessionScope(token, storage)); expect(scope.current(operation)).toBe(false); expect(scope.current(replacement)).toBe(false);
  });
});
