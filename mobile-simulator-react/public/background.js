// background.js
// Handles network header modifications (SOP bypass + dynamic mobile User-Agent emulation)

const IOS_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID_UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

// Update dynamic declarativeNetRequest rules based on the emulated OS
function updateRules(mode) {
  const ua = mode === 'ios' ? IOS_UA : ANDROID_UA;
  const platform = mode === 'ios' ? 'iOS' : 'Android';

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1, 2],
    addRules: [
      // Rule 1: Bypass frame restrictions (SOP bypass)
      {
        id: 1,
        priority: 1,
        action: {
          type: "modifyHeaders",
          responseHeaders: [
            { header: "x-frame-options", operation: "remove" },
            { header: "content-security-policy", operation: "remove" },
            { header: "frame-ancestors", operation: "remove" }
          ]
        },
        condition: {
          urlFilter: "*",
          resourceTypes: ["sub_frame"]
        }
      },
      // Rule 2: Dynamic Mobile User-Agent and Client Hints redirection
      {
        id: 2,
        priority: 2,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            { header: "user-agent", operation: "set", value: ua },
            { header: "sec-ch-ua-mobile", operation: "set", value: "?1" },
            { header: "sec-ch-ua-platform", operation: "set", value: `"${platform}"` }
          ]
        },
        condition: {
          urlFilter: "*",
          resourceTypes: ["sub_frame", "stylesheet", "script", "image", "xmlhttprequest"]
        }
      }
    ]
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('[Emulator Background] DNR update rule error:', chrome.runtime.lastError.message);
    } else {
      console.log(`[Emulator Background] Dynamic rules updated for: ${mode}`);
    }
  });

  // Keep state sync in chrome storage
  chrome.storage.local.set({ emulationMode: mode });
}

// Installation hooks
chrome.runtime.onInstalled.addListener(() => {
  // Default to iOS emulation rule
  updateRules('ios');
  
  // Set default panel behavior
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('[Emulator Background] Side Panel error:', error));
});

// Listener for active mode toggles from the side panel UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_EMULATION_MODE') {
    updateRules(message.mode);
    sendResponse({ success: true, mode: message.mode });
    return true; // Keep response channel alive for async
  }
});
