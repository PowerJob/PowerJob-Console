import { useEffect, useRef } from 'react';

export class RequestScope {
  private generation = 0;
  constructor(private context: string) {}
  update(context: string) { if (context !== this.context) { this.context = context; this.invalidate(); } }
  invalidate() { ++this.generation; }
  capture() { return this.generation; }
  current(token: number) { return token === this.generation; }
}

export function useRequestScope(context: string) {
  const scope = useRef<RequestScope>(undefined);
  if (!scope.current) scope.current = new RequestScope(context);
  scope.current.update(context);
  useEffect(() => () => scope.current?.invalidate(), []);
  return scope.current;
}
