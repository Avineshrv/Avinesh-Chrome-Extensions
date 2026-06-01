// background.js
// Handles network header modifications (SOP bypass + dynamic mobile User-Agent emulation)

const IOS_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID_UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

// Hardcoded RSA Public Key (Base64) - Matches server's private key for signature validation
const PUBLIC_KEY_BASE64 = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn3iUMLAfZc81o0PqB6H0JAx2/V4cnihGtaDPYznUbdWmR2ncAHUWHU40LjhpMSoID0mjKpx5X9YNWwWPd4/j+Pcr56Zici/dOQDMQPycxYHamxTt+Uo1j4m+oep4Lt1lNV3H0ttTxfqMvhaRPYNdT8+dP/sWJtU2KXXF6pLZY6UW+1dix0tGiaTz5fz7G/NwQxmnObbG/WOSe5UA59Lvn/eBhmjtd08y2DvQW4ro6N4jwKt3lrz8MPLg3zhv5NPEkezOU4HNEYSMtZgehlwvZvv5ign+w84/Vz/7Ow+dI9gM3iT2kSiotQ5RBFOlYMcslM1bcL1nhyb3NhJjsRvVWQIDAQAB";

// Base64 helper to ArrayBuffer (Service Worker friendly)
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Cryptographic verification using browser SubtleCrypto
async function verifyLicenseSignature(licensePayload, signatureBase64) {
  try {
    const keyData = base64ToArrayBuffer(PUBLIC_KEY_BASE64);
    const publicKey = await crypto.subtle.importKey(
      "spki",
      keyData,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256"
      },
      false,
      ["verify"]
    );

    const encoder = new TextEncoder();
    const data = encoder.encode(licensePayload);
    const signature = base64ToArrayBuffer(signatureBase64);

    return await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      signature,
      data
    );
  } catch (err) {
    console.error('[Background Cryptography] RSA verification failed:', err);
    return false;
  }
}

// Securely check if local/sync storage contains a valid cryptographic premium license (with auto-migration)
async function checkPremiumStatus() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['active_license', 'installationId'], async (syncResult) => {
      let license = syncResult.active_license;
      let installId = syncResult.installationId;

      if (!license || !installId) {
        // Fallback to local
        chrome.storage.local.get(['active_license', 'installationId'], async (localResult) => {
          license = localResult.active_license;
          installId = localResult.installationId;
          
          if (!license || !license.payload || !license.signature || !installId) {
            resolve(false);
            return;
          }
          
          // Migrate local to sync for Chrome Profile Synchronization
          chrome.storage.sync.set({ active_license: license, installationId: installId }, () => {
            console.log('[Background Shield] Successfully migrated local license & installation ID to Chrome Sync storage.');
          });
          
          verifyAndResolve(license, installId);
        });
      } else {
        verifyAndResolve(license, installId);
      }

      async function verifyAndResolve(lic, instId) {
        if (!lic || !lic.payload || !lic.signature || !instId) {
          resolve(false);
          return;
        }

        const isValidSignature = await verifyLicenseSignature(lic.payload, lic.signature);
        if (!isValidSignature) {
          resolve(false);
          return;
        }

        try {
          const payload = JSON.parse(lic.payload);
          if (payload.installationId !== instId) {
            resolve(false);
            return;
          }

          if (payload.status === 'premium') {
            resolve(true);
            return;
          }
        } catch (err) {
          console.error('[Background Shield] License payload parse error:', err);
        }

        resolve(false);
      }
    });
  });
}

// Update dynamic declarativeNetRequest rules based on the emulated OS
async function updateRules(mode) {
  const isPremium = await checkPremiumStatus();
  console.log(`[Background Emulation] Premium Status Verified: ${isPremium ? 'PREMIUM ACTIVE' : 'FREE ACTIVE'}`);

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
      console.log(`[Emulator Background] Emulation rules successfully enabled for mode: ${mode}`);
    }
  });

  // Keep state sync in chrome storage
  chrome.storage.local.set({ emulationMode: mode });
}

// Installation hooks (with cross-device profile synchronization support)
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['installationId'], (syncResult) => {
    if (syncResult.installationId) {
      console.log(`[Emulator Background] Existing installation ID found in Chrome Sync: ${syncResult.installationId}`);
      // Keep local in sync
      chrome.storage.local.set({ installationId: syncResult.installationId });
      updateRules('ios');
    } else {
      // Fallback check local
      chrome.storage.local.get(['installationId'], (localResult) => {
        if (localResult.installationId) {
          console.log(`[Emulator Background] Existing installation ID found in local: ${localResult.installationId}`);
          chrome.storage.sync.set({ installationId: localResult.installationId });
          updateRules('ios');
        } else {
          // Generate a completely new installation ID
          const newInstallId = 'inst_' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          chrome.storage.sync.set({ installationId: newInstallId }, () => {
            chrome.storage.local.set({ installationId: newInstallId }, () => {
              console.log(`[Emulator Background] Generated and synced new installation ID: ${newInstallId}`);
              updateRules('ios');
            });
          });
        }
      });
    }
  });

  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('[Emulator Background] Side Panel error:', error));
});

// Listener for active mode toggles from the side panel UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_EMULATION_MODE') {
    updateRules(message.mode).then(() => {
      sendResponse({ success: true, mode: message.mode });
    });
    return true; // Keep response channel alive for async
  }
  
  if (message.type === 'PAYMENT_COMPLETED') {
    console.log('[Emulator Background] Payment completed message received. Saving license to sync + local storage...');
    chrome.storage.sync.set({ active_license: message.license }, () => {
      chrome.storage.local.set({ active_license: message.license }, () => {
        chrome.storage.local.get(['emulationMode'], (result) => {
          updateRules(result.emulationMode || 'ios').then(() => {
            sendResponse({ success: true });
          });
        });
      });
    });
    return true; // Keep response channel alive for async
  }
});
