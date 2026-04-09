import { section, assert, pass } from './_assert.mjs';

function shouldNavigateAfterDestroy(state) {
  return (
    !!state.projectInfo &&
    !!state.onNavigate &&
    !state.isNavigating &&
    !state.isDisposing &&
    state.redirectEnabled === true
  );
}

section('shouldNavigateAfterDestroy: happy path');
assert.equal(
  shouldNavigateAfterDestroy({
    projectInfo: { projectId: 'foo' },
    onNavigate: () => {},
    isNavigating: false,
    isDisposing: false,
    redirectEnabled: true,
  }),
  true
);
pass('navigates when active and not disposing');

section('shouldNavigateAfterDestroy: blocked while disposing');
assert.equal(
  shouldNavigateAfterDestroy({
    projectInfo: { projectId: 'foo' },
    onNavigate: () => {},
    isNavigating: false,
    isDisposing: true,
    redirectEnabled: true,
  }),
  false
);
pass('does not navigate while disposing');

section('shouldNavigateAfterDestroy: blocked when isNavigating already');
assert.equal(
  shouldNavigateAfterDestroy({
    projectInfo: { projectId: 'foo' },
    onNavigate: () => {},
    isNavigating: true,
    isDisposing: false,
    redirectEnabled: true,
  }),
  false
);
pass('does not navigate while a navigation is already in flight');

section('shouldNavigateAfterDestroy: blocked when redirectEnabled false');
assert.equal(
  shouldNavigateAfterDestroy({
    projectInfo: { projectId: 'foo' },
    onNavigate: () => {},
    isNavigating: false,
    isDisposing: false,
    redirectEnabled: false,
  }),
  false
);
pass('does not navigate when redirect gate is closed');
