import type { RequestOptions } from './api';

export function createAppRequestScope(appId: string, token: string | null, storage: Pick<Storage, 'getItem'> = localStorage) {
  const controller = new AbortController();
  return {
    appId,
    token,
    options: { headers: { AppId: appId }, signal: controller.signal } satisfies RequestOptions,
    current: () => !controller.signal.aborted && storage.getItem('Power_appId') === appId && storage.getItem('PowerJwt') === token,
    dispose: () => controller.abort(),
  };
}
