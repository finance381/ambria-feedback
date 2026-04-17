import { useEffect } from 'react';

/**
 * Kiosk lock during guest form.
 * - Enters fullscreen on mount
 * - Traps back button
 * - Warns on refresh/close
 * Caveat: OS-level gestures (swipe-home, recents, notification pulldown)
 * cannot be blocked by web code. Use Android Screen Pinning for that.
 */
export function useKioskLock(enabled) {
  useEffect(function () {
    if (!enabled) return;

    // Fullscreen
    try {
      var el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(function () {});
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch (e) {}

    // Back button trap — push a sentinel state, catch popstate
    window.history.pushState({ kiosk: true }, '');
    function onPop(e) {
      // Re-push so back doesn't escape
      window.history.pushState({ kiosk: true }, '');
    }
    window.addEventListener('popstate', onPop);

    // Refresh/close warning
    function onBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);

    return function () {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('beforeunload', onBeforeUnload);
      try {
        if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
        else if (document.webkitFullscreenElement) document.webkitExitFullscreen();
      } catch (e) {}
    };
  }, [enabled]);
}
