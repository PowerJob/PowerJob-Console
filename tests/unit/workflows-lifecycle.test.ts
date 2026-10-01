import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { session } from '../../src/core/session';
import { answerConfirmation, confirmation } from '../../src/core/ui';
import { useScope } from '../../src/features/workflows/useScope';

afterEach(() => { answerConfirmation(false); vi.restoreAllMocks(); });
function mountedScope() { let scope!: ReturnType<typeof useScope>; const wrapper = mount(defineComponent({ setup() { scope = useScope(); return () => h('div'); } })); return { scope, wrapper }; }

describe('workflow context lifetime', () => {
  it('invalidates both a held request and confirmation before a new route can act', async () => {
    const { scope, wrapper } = mountedScope(); const request = scope.capture(); const aborted = vi.fn(); request.signal.addEventListener('abort', aborted);
    const confirm = scope.confirm('Stop workflow instance #A?'); expect(confirmation.open).toBe(true);
    scope.invalidate(); expect(await confirm).toBe(false); expect(confirmation.open).toBe(false); expect(request.valid()).toBe(false); expect(aborted).toHaveBeenCalledOnce();
    const next = scope.capture(); expect(next.valid()).toBe(true); expect(next.signal.aborted).toBe(false); wrapper.unmount();
  });
  it('ignores old success/error callbacks when app or session changes even before the watcher runs', () => {
    const { scope, wrapper } = mountedScope(); const before = session.revision; const request = scope.capture(); session.revision++; expect(request.valid()).toBe(false); session.revision = before;
    const second = scope.capture(), originalApp = session.appId; session.appId = 'another-app'; expect(second.valid()).toBe(false); session.appId = originalApp; wrapper.unmount();
  });
  it('aborts all outstanding requests and cancels its own pending dialog on unmount', async () => {
    const { scope, wrapper } = mountedScope(); const first = scope.capture(), second = scope.capture(); const decision = scope.confirm('Delete owned workflow?'); wrapper.unmount(); expect(first.signal.aborted).toBe(true); expect(second.signal.aborted).toBe(true); expect(await decision).toBe(false);
  });
  it('does not cancel another feature dialog after its own confirmation is replaced', async () => {
    const { scope, wrapper } = mountedScope(); const own = scope.confirm('Stop owned instance?'); const { confirmAction } = await import('../../src/core/ui'); const other = confirmAction('Delete another resource?'); expect(await own).toBe(false); scope.invalidate(); expect(confirmation.open).toBe(true); expect(confirmation.message).toBe('Delete another resource?'); answerConfirmation(false); await other; wrapper.unmount();
  });
});
