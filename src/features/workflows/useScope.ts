import { onBeforeUnmount } from 'vue';
import { session } from '../../core/session';
import { answerConfirmation, confirmation, confirmAction } from '../../core/ui';

/** Every request and confirmation captures both route and application context. */
export function useScope() {
  let generation = 0;
  const requests = new Set<AbortController>();
  let confirmationMessage: string | undefined;
  const invalidate = () => { generation++; for (const request of requests) request.abort(); requests.clear(); if (confirmationMessage && confirmation.open && confirmation.message === confirmationMessage) answerConfirmation(false); confirmationMessage = undefined; };
  onBeforeUnmount(invalidate);
  const capture = () => {
    const current = generation, revision = session.revision, appId = session.appId;
    const controller = new AbortController(); requests.add(controller);
    return { signal: controller.signal, valid: () => current === generation && revision === session.revision && appId === session.appId && !controller.signal.aborted, release: () => requests.delete(controller) };
  };
  const confirm = async (message: string) => { confirmationMessage = message; try { return await confirmAction(message); } finally { if (confirmationMessage === message) confirmationMessage = undefined; } };
  return { invalidate, capture, confirm };
}
