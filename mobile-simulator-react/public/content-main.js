// content-main.js
// Runs in the MAIN world (page context) to override read-only navigator properties, bypassing inline CSP blocks.

(function() {
  const IOS_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
  const ANDROID_UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

  let overridesApplied = false;

  function applyOverrides(mode) {
    // Avoid double overrides unless the mode changes
    if (overridesApplied && window.__activeEmulationMode === mode) return;
    
    const ua = mode === 'ios' ? IOS_UA : ANDROID_UA;
    const platform = mode === 'ios' ? 'iPhone' : 'Linux armv8l';

    try {
      Object.defineProperty(navigator, 'userAgent', {
        get: () => ua,
        configurable: true
      });
      Object.defineProperty(navigator, 'platform', {
        get: () => platform,
        configurable: true
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        get: () => 5,
        configurable: true
      });
      
      // Override touch capability detection
      if (window.TouchEvent === undefined) {
        window.TouchEvent = function() {};
      }
      
      window.__activeEmulationMode = mode;
      overridesApplied = true;
      console.log(`[Emulator Main World] Navigator properties successfully overridden for: ${mode}`);
    } catch (e) {
      console.error('[Emulator Main World] Navigator override failed:', e);
    }
  }

  // Listen for the custom synchronization event dispatched by content.js (Isolated World)
  window.addEventListener('__EMULATOR_SET_MODE', (event) => {
    if (event.detail && event.detail.mode) {
      applyOverrides(event.detail.mode);
    }
  });

  // Re-verify and override periodically in case SPA pages modify navigator properties
  setInterval(() => {
    if (window.__activeEmulationMode) {
      applyOverrides(window.__activeEmulationMode);
    }
  }, 1000);
})();
