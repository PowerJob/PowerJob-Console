import { useEffect, useRef } from 'react';
import type { SessionScope } from '../../lib/sessionScope';

export class RequestScope {
  private generation = 0;
  constructor(private context: string, private session?: SessionScope) {}
  update(context: string, session = this.session) { if (context !== this.context || session !== this.session) { this.context = context; this.session = session; this.invalidate(); } }
  invalidate() { ++this.generation; }
  capture() { return this.generation; }
  current(token: number) { return token === this.generation && (!this.session || this.session.current()); }
}

export function useRequestScope(context: string, session?: SessionScope) {
  const scope = useRef<RequestScope>(undefined);
  if (!scope.current) scope.current = new RequestScope(context, session);
  scope.current.update(context, session);
  useEffect(() => () => scope.current?.invalidate(), []);
  return scope.current;
}
