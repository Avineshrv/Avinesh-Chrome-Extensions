// content.js
// Runs inside the context of all loaded frames (including the emulator iframe)

(function() {
  // Prevent duplicate injections
  if (window.__mobileEmulatorInjected) return;
  window.__mobileEmulatorInjected = true;

  // We only run tracking in iframes (where window.self !== window.top)
  if (window.self === window.top) return;

  // Inject early scrollbar-hiding CSS inside the emulator viewport iframe
  try {
    const style = document.createElement('style');
    style.id = '__emulator_scrollbar_hider';
    style.innerHTML = `
      * {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      ::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);

    // Setup resilient observer to ensure styling persists across DOM rebuilds
    const observer = new MutationObserver(() => {
      const el = document.getElementById('__emulator_scrollbar_hider');
      if (!el) {
        (document.head || document.documentElement).appendChild(style);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {
    console.warn('[Emulator Content Script] Early scrollbar hider injection failed:', e);
  }

  // Retrieve emulationMode from local storage and dispatch to MAIN world script immediately
  chrome.storage.local.get(['emulationMode'], (result) => {
    const mode = result.emulationMode || 'ios';
    window.dispatchEvent(new CustomEvent('__EMULATOR_SET_MODE', { detail: { mode } }));
  });

  let isInitialized = false;
  let emulatorParentWindow = null;
  let activeElement = null;

  // Listen for handshake from the emulator side panel
  window.addEventListener('message', (event) => {
    // We accept handshake from parent window
    if (event.source === window.parent && event.data && event.data.type === 'EMULATOR_INIT') {
      isInitialized = true;
      emulatorParentWindow = event.source;
      
      // Sync the mode to the main world
      if (event.data.mode) {
        window.dispatchEvent(new CustomEvent('__EMULATOR_SET_MODE', { 
          detail: { mode: event.data.mode } 
        }));
      }

      if (event.data.safeAreaTop !== undefined && event.data.safeAreaBottom !== undefined) {
        updateSafeAreaPadding(event.data.safeAreaTop, event.data.safeAreaBottom);
      }

      // Reply to confirm connection
      emulatorParentWindow.postMessage({
        type: 'EMULATOR_INIT_ACK',
        url: window.location.href
      }, '*');

      console.log('[Emulator Content Script] Initialized handshake successfully.');
    }

    // Process typing / input requests from parent virtual keyboard
    if (isInitialized && event.data) {
      if (event.data.type === 'EMULATOR_SYNC') {
        if (event.data.safeAreaTop !== undefined && event.data.safeAreaBottom !== undefined) {
          updateSafeAreaPadding(event.data.safeAreaTop, event.data.safeAreaBottom);
        }
      } else if (event.data.type === 'KEYBOARD_INPUT') {
        handleKeyboardInput(event.data);
      } else if (event.data.type === 'EMULATOR_NAV') {
        const { action } = event.data;
        try {
          if (action === 'back') {
            window.history.back();
          } else if (action === 'forward') {
            window.history.forward();
          } else if (action === 'refresh') {
            window.location.reload();
          }
        } catch (e) {
          console.error('[Emulator Content Script] Navigation error:', e);
        }
      } else if (event.data.type === 'KEYBOARD_SCROLL_ALIGN') {
        if (activeElement) {
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else if (event.data.type === 'KEYBOARD_BLUR') {
        if (activeElement) {
          activeElement.blur();
        }
      }
    }
  });

  // Track active input focus
  document.addEventListener('focusin', (e) => {
    if (!isInitialized || !emulatorParentWindow) return;
    
    const target = e.target;
    if (isInputTarget(target)) {
      activeElement = target;
      reportFocusState('open');
      
      // Listen for text/cursor selection updates
      target.addEventListener('mouseup', handleCursorSelectionUpdate);
      target.addEventListener('keyup', handleCursorSelectionUpdate);
    }
  }, true);

  document.addEventListener('focusout', (e) => {
    if (!isInitialized || !emulatorParentWindow) return;
    
    const target = e.target;
    if (isInputTarget(target)) {
      target.removeEventListener('mouseup', handleCursorSelectionUpdate);
      target.removeEventListener('keyup', handleCursorSelectionUpdate);
      
      // Delay slightly to check if focus moved to another input
      setTimeout(() => {
        if (document.activeElement !== target && !isInputTarget(document.activeElement)) {
          reportFocusState('close');
          activeElement = null;
        }
      }, 50);
    }
  }, true);

  // Check if target is an interactive input
  function isInputTarget(element) {
    if (!element) return false;
    const tagName = element.tagName;
    const isEditable = element.contentEditable === 'true' || element.getAttribute('contenteditable') === 'true';
    return (
      tagName === 'INPUT' || 
      tagName === 'TEXTAREA' || 
      isEditable || 
      element.getAttribute('role') === 'textbox'
    );
  }

  // Handle selection updates and report current cursor pos
  function handleCursorSelectionUpdate() {
    if (!activeElement || !emulatorParentWindow) return;
    reportFocusState('update');
  }

  // Report focused state and metrics to the parent side panel
  function reportFocusState(status) {
    if (!activeElement || !emulatorParentWindow) return;

    try {
      const rect = activeElement.getBoundingClientRect();
      const payload = {
        type: 'KEYBOARD_TRIGGER',
        status: status,
        inputType: activeElement.type || 'text',
        value: activeElement.value || activeElement.innerText || '',
        selectionStart: activeElement.selectionStart || 0,
        selectionEnd: activeElement.selectionEnd || 0,
        bounds: {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          height: rect.height,
          width: rect.width
        }
      };
      emulatorParentWindow.postMessage(payload, '*');
    } catch (err) {
      console.error('[Emulator Content Script] Failed to report focus metrics:', err);
    }
  }

  // Framework-friendly value modifier (handles React, Vue, Angular)
  function setElementValue(element, newValue) {
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      const prototype = Object.getPrototypeOf(element);
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
      
      if (descriptor && descriptor.set) {
        // Bypass React's overridden setter
        descriptor.set.call(element, newValue);
      } else {
        element.value = newValue;
      }
    } else {
      // Contenteditable elements
      element.innerText = newValue;
    }
  }

  // Synthesis engine for virtual keys
  function handleKeyboardInput(data) {
    if (!activeElement) return;

    const { action, char } = data;
    const start = activeElement.selectionStart ?? 0;
    const end = activeElement.selectionEnd ?? 0;
    const currentValue = activeElement.value ?? activeElement.innerText ?? '';

    // Function to dispatch keyevents in sequence
    const dispatchKeyEvent = (type, keyName, keyCode) => {
      const event = new KeyboardEvent(type, {
        key: keyName,
        code: keyName === ' ' ? 'Space' : keyName,
        keyCode: keyCode,
        which: keyCode,
        bubbles: true,
        cancelable: true,
        composed: true
      });
      activeElement.dispatchEvent(event);
      return event;
    };

    if (char !== null && char !== undefined) {
      // Normal Character Input
      const keyName = char;
      const keyCode = char.charCodeAt(0);

      const preventDefault = dispatchKeyEvent('keydown', keyName, keyCode).defaultPrevented;
      if (!preventDefault) {
        const newValue = currentValue.slice(0, start) + char + currentValue.slice(end);
        setElementValue(activeElement, newValue);
        
        // Advance selection index
        const newCursorPos = start + char.length;
        if (activeElement.setSelectionRange) {
          activeElement.setSelectionRange(newCursorPos, newCursorPos);
        }
        
        // Dispatch value modification notifications
        activeElement.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        activeElement.dispatchEvent(new Event('change', { bubbles: true }));
      }
      dispatchKeyEvent('keyup', keyName, keyCode);

    } else if (action === 'backspace') {
      // Backspace Delete
      const preventDefault = dispatchKeyEvent('keydown', 'Backspace', 8).defaultPrevented;
      if (!preventDefault) {
        let newValue = currentValue;
        let newCursorPos = start;

        if (start === end && start > 0) {
          newValue = currentValue.slice(0, start - 1) + currentValue.slice(end);
          newCursorPos = start - 1;
        } else if (start !== end) {
          newValue = currentValue.slice(0, start) + currentValue.slice(end);
          newCursorPos = start;
        }

        setElementValue(activeElement, newValue);
        if (activeElement.setSelectionRange) {
          activeElement.setSelectionRange(newCursorPos, newCursorPos);
        }

        activeElement.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        activeElement.dispatchEvent(new Event('change', { bubbles: true }));
      }
      dispatchKeyEvent('keyup', 'Backspace', 8);

    } else if (action === 'enter') {
      // Enter / Submit Form
      const preventDefault = dispatchKeyEvent('keydown', 'Enter', 13).defaultPrevented;
      if (!preventDefault) {
        // Trigger submit button click or form submit
        if (activeElement.form) {
          const submitBtn = activeElement.form.querySelector('input[type="submit"], button[type="submit"]');
          if (submitBtn) {
            submitBtn.click();
          } else {
            // Trigger standard form submit events
            const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
            if (activeElement.form.dispatchEvent(submitEvent)) {
              activeElement.form.submit();
            }
          }
        }
      }
      dispatchKeyEvent('keyup', 'Enter', 13);
    }

    // Refresh state report
    reportFocusState('update');
  }

  // Listen for scrolling/viewport changes to update layout coordinates dynamically
  window.addEventListener('scroll', () => {
    if (activeElement) {
      reportFocusState('update');
    }
  }, true);

  window.addEventListener('resize', () => {
    if (activeElement) {
      reportFocusState('update');
    }
  });

  // --- High-Fidelity Touch Emulation (Mouse-to-Touch Bridge) ---
  // Enables swiping/dragging to scroll mobile carousels, lists, and reels (e.g. YouTube Shorts)
  (function() {
    let activeTouch = null;
    let startX = 0;
    let startY = 0;
    let isSwiping = false;

    document.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Only primary clicks
      
      const target = e.target;
      // Skip emulation for form elements if they are interactive input fields
      const tagName = target.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || target.contentEditable === 'true' || target.getAttribute('contenteditable') === 'true') {
        return;
      }
      
      startX = e.clientX;
      startY = e.clientY;
      isSwiping = false;

      activeTouch = {
        identifier: 0,
        target: target,
        clientX: e.clientX,
        clientY: e.clientY,
        screenX: e.screenX,
        screenY: e.screenY,
        pageX: e.pageX,
        pageY: e.pageY
      };

      const touchObj = new Touch(activeTouch);
      const touchEvent = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        composed: true,
        touches: [touchObj],
        targetTouches: [touchObj],
        changedTouches: [touchObj]
      });
      
      target.dispatchEvent(touchEvent);
    }, true);

    document.addEventListener('mousemove', (e) => {
      if (!activeTouch) return;

      const target = activeTouch.target;
      
      // Calculate move delta to verify swipe threshold
      const deltaX = Math.abs(e.clientX - startX);
      const deltaY = Math.abs(e.clientY - startY);
      if (deltaX > 3 || deltaY > 3) {
        isSwiping = true;
      }

      activeTouch.clientX = e.clientX;
      activeTouch.clientY = e.clientY;
      activeTouch.screenX = e.screenX;
      activeTouch.screenY = e.screenY;
      activeTouch.pageX = e.pageX;
      activeTouch.pageY = e.pageY;

      const touchObj = new Touch(activeTouch);
      const touchEvent = new TouchEvent('touchmove', {
        bubbles: true,
        cancelable: true,
        composed: true,
        touches: [touchObj],
        targetTouches: [touchObj],
        changedTouches: [touchObj]
      });

      target.dispatchEvent(touchEvent);

      // If swiping, prevent default browser actions like text selection or dragging links/images
      if (isSwiping) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    }, true);

    document.addEventListener('mouseup', (e) => {
      if (!activeTouch) return;

      const target = activeTouch.target;
      activeTouch.clientX = e.clientX;
      activeTouch.clientY = e.clientY;
      activeTouch.screenX = e.screenX;
      activeTouch.screenY = e.screenY;
      activeTouch.pageX = e.pageX;
      activeTouch.pageY = e.pageY;

      const touchObj = new Touch(activeTouch);
      const touchEvent = new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        composed: true,
        touches: [],
        targetTouches: [],
        changedTouches: [touchObj]
      });

      target.dispatchEvent(touchEvent);
      activeTouch = null;

      // If the user was swiping/dragging, prevent default click action to avoid unwanted clicks on release
      if (isSwiping) {
        e.stopPropagation();
        const preventClick = (clickEvent) => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          document.removeEventListener('click', preventClick, true);
        };
        document.addEventListener('click', preventClick, true);
        setTimeout(() => {
          document.removeEventListener('click', preventClick, true);
        }, 50);
      }
    }, true);
  })();

  function updateSafeAreaPadding(top, bottom) {
    try {
      let style = document.getElementById('__emulator_safe_area_padding');
      if (!style) {
        style = document.createElement('style');
        style.id = '__emulator_safe_area_padding';
        (document.head || document.documentElement).appendChild(style);
      }
      style.innerHTML = `
        :root {
          --safe-area-inset-top: ${top}px !important;
          --safe-area-inset-bottom: ${bottom}px !important;
        }
        body {
          padding-top: 8px !important;
          box-sizing: border-box !important;
        }
      `;
    } catch (e) {
      console.warn('[Emulator Content Script] Failed to update safe area padding:', e);
    }
  }

})();
