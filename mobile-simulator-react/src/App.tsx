import React, { useState, useEffect, useRef } from 'react';
import { ControlBar } from './components/ControlBar.tsx';
import { StatusBars } from './components/StatusBars.tsx';
import { SoftKeys } from './components/SoftKeys.tsx';
import { VirtualKeyboard } from './components/VirtualKeyboard.tsx';

declare const chrome: any;

export interface DeviceConfig {
  name: string;
  os: 'ios' | 'android';
  brand: 'apple' | 'samsung' | 'pixel';
  width: number;
  height: number;
  bezel: number;
  radius: number;
  camera: 'dynamic-island' | 'camera-punch' | 'iphone-notch' | 'iphone-notch-narrow';
  chassisClass: string;
}

export const DEVICES_CONFIG: Record<string, DeviceConfig> = {
  // --- iOS Devices ---
  'iphone-16-pro-max': {
    name: 'iPhone 16 Pro Max',
    os: 'ios',
    brand: 'apple',
    width: 440,
    height: 956,
    bezel: 8,
    radius: 54,
    camera: 'dynamic-island',
    chassisClass: 'iphone-16-pro-max'
  },
  'iphone-16-pro': {
    name: 'iPhone 16 Pro',
    os: 'ios',
    brand: 'apple',
    width: 402,
    height: 874,
    bezel: 8,
    radius: 50,
    camera: 'dynamic-island',
    chassisClass: 'iphone-16-pro'
  },
  'iphone-16': {
    name: 'iPhone 16',
    os: 'ios',
    brand: 'apple',
    width: 393,
    height: 852,
    bezel: 10,
    radius: 44,
    camera: 'dynamic-island',
    chassisClass: 'iphone-16'
  },
  'iphone-15-pro-max': {
    name: 'iPhone 15 Pro Max',
    os: 'ios',
    brand: 'apple',
    width: 430,
    height: 932,
    bezel: 12,
    radius: 48,
    camera: 'dynamic-island',
    chassisClass: 'iphone-15-pro-max'
  },
  'iphone-15-pro': {
    name: 'iPhone 15 Pro',
    os: 'ios',
    brand: 'apple',
    width: 393,
    height: 852,
    bezel: 12,
    radius: 44,
    camera: 'dynamic-island',
    chassisClass: 'iphone-15-pro'
  },
  'iphone-13': {
    name: 'iPhone 13 (Notch)',
    os: 'ios',
    brand: 'apple',
    width: 390,
    height: 844,
    bezel: 11,
    radius: 42,
    camera: 'iphone-notch-narrow',
    chassisClass: 'iphone-13'
  },
  'iphone-x': {
    name: 'iPhone X (Notch)',
    os: 'ios',
    brand: 'apple',
    width: 375,
    height: 812,
    bezel: 12,
    radius: 40,
    camera: 'iphone-notch',
    chassisClass: 'iphone-x'
  },
  // --- Pixel Devices ---
  'pixel-9-pro-xl': {
    name: 'Pixel 9 Pro XL',
    os: 'android',
    brand: 'pixel',
    width: 424,
    height: 918,
    bezel: 9,
    radius: 48,
    camera: 'camera-punch',
    chassisClass: 'pixel-9-pro-xl'
  },
  'pixel-9-pro': {
    name: 'Pixel 9 Pro',
    os: 'android',
    brand: 'pixel',
    width: 412,
    height: 892,
    bezel: 9,
    radius: 46,
    camera: 'camera-punch',
    chassisClass: 'pixel-9-pro'
  },
  'pixel-9': {
    name: 'Pixel 9',
    os: 'android',
    brand: 'pixel',
    width: 400,
    height: 864,
    bezel: 11,
    radius: 44,
    camera: 'camera-punch',
    chassisClass: 'pixel-9'
  },
  // --- Samsung Devices ---
  'galaxy-s24-ultra': {
    name: 'Galaxy S24 Ultra',
    os: 'android',
    brand: 'samsung',
    width: 428,
    height: 932,
    bezel: 10,
    radius: 12,
    camera: 'camera-punch',
    chassisClass: 'galaxy-s24-ultra'
  },
  'galaxy-s24-plus': {
    name: 'Galaxy S24+',
    os: 'android',
    brand: 'samsung',
    width: 412,
    height: 896,
    bezel: 9,
    radius: 32,
    camera: 'camera-punch',
    chassisClass: 'galaxy-s24-plus'
  },
  'galaxy-s24': {
    name: 'Galaxy S24',
    os: 'android',
    brand: 'samsung',
    width: 384,
    height: 832,
    bezel: 10,
    radius: 30,
    camera: 'camera-punch',
    chassisClass: 'galaxy-s24'
  }
};

export type DeviceType = keyof typeof DEVICES_CONFIG;
type OsModeType = 'ios' | 'android';
type OrientationType = 'portrait' | 'landscape';

export const App: React.FC = () => {
  // Global React States
  const [device, setDevice] = useState<DeviceType>('iphone-16-pro');
  const [osMode, setOsMode] = useState<OsModeType>('ios');
  const [osFilter, setOsFilter] = useState<'all' | 'ios' | 'android'>('all');
  const [orientation, setOrientation] = useState<OrientationType>('portrait');
  const [keyboardPage, setKeyboardPage] = useState<'abc' | 'ABC' | 'num' | 'sym' | 'emoji'>('abc');
  const [shiftActive, setShiftActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [iframeUrl, setIframeUrl] = useState('https://www.google.com');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [inputBounds, setInputBounds] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // --- DNR Emulation & Body Class Syncing ---
  useEffect(() => {
    // Notify background script of active mode switches (for User-Agent rules redirects)
    if (typeof window !== 'undefined' && (window as any).chrome && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'SET_EMULATION_MODE', mode: osMode }, (response: any) => {
        if (chrome.runtime.lastError) {
          console.warn('[Emulator React App] Storage/DNR communication error:', chrome.runtime.lastError.message);
        } else {
          console.log('[Emulator React App] DNR and Storage synchronized for:', response?.mode);
        }
      });
    }

    // Clear active virtual keyboard page shifts
    setKeyboardPage('abc');
    setShiftActive(false);
  }, [osMode]);

  useEffect(() => {
    // Sync class list states to document body directly (bridges App.css selectors)
    document.body.className = `${osMode}-mode ${keyboardOpen ? 'keyboard-open' : ''}`;
  }, [osMode, keyboardOpen]);

  useEffect(() => {
    // Query the active tab's URL on startup and load it
    if (typeof window !== 'undefined' && (window as any).chrome && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
        const activeTab = tabs && tabs[0];
        if (activeTab && activeTab.url) {
          const url = activeTab.url.trim();
          // Fallback to Google if the URL is empty or a special browser system/settings page
          if (
            !url ||
            url.startsWith('chrome://') ||
            url.startsWith('chrome-search://') ||
            url.startsWith('about:') ||
            url.startsWith('edge://')
          ) {
            handleLoadUrl('https://www.google.com');
          } else {
            handleLoadUrl(url);
          }
        } else {
          handleLoadUrl('https://www.google.com');
        }
      });
    } else {
      handleLoadUrl('https://www.google.com');
    }
  }, []);

  // --- Automatic Fit Device-Scaling ---
  const adjustDeviceScale = () => {
    const container = document.getElementById('emulator-main');
    const wrapper = document.getElementById('device-wrapper');
    const scaleContainer = document.getElementById('device-scale-container');
    if (!container || !wrapper || !scaleContainer) return;

    const config = DEVICES_CONFIG[device];
    if (!config) return;

    // Buffer space of 20px on each side (40px total)
    const containerW = container.clientWidth - 40;
    const containerH = container.clientHeight - 40;

    let naturalW = config.width + (config.bezel * 2);
    let naturalH = config.height + (config.bezel * 2);

    if (orientation === 'landscape') {
      const temp = naturalW;
      naturalW = naturalH;
      naturalH = temp;
    }

    // Calculate maximum fit scale multiplier
    const scaleX = containerW / naturalW;
    const scaleY = containerH / naturalH;
    const scale = Math.min(scaleX, scaleY, 1); // Cap scale at 100% maximum

    // Set scale container size to exact scaled boundaries to prevent container outer scrollbars!
    scaleContainer.style.width = `${naturalW * scale}px`;
    scaleContainer.style.height = `${naturalH * scale}px`;

    // Apply transform scale on device wrapper
    wrapper.style.transform = `scale(${scale})`;
  };

  useEffect(() => {
    const container = document.getElementById('emulator-main');
    if (!container) return;

    // Recalculate dimensions immediately
    adjustDeviceScale();

    // Setup ResizeObserver to monitor the container sizing settled transitions
    const observer = new ResizeObserver(() => {
      adjustDeviceScale();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [device, orientation, osMode]);

  // --- Handshake & Communication loop with Frame ---
  const sendInputToFrame = (data: { char?: string | null; action?: string }) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'KEYBOARD_INPUT',
        ...data
      }, '*');
    }
  };

  const sendNavToFrame = (action: 'back' | 'forward' | 'refresh') => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'EMULATOR_NAV',
        action: action
      }, '*');
    }
  };

  const getSafeAreaInsets = () => {
    let safeTop = 42;
    let safeBottom = 20;
    
    const currentConfig = DEVICES_CONFIG[device] || DEVICES_CONFIG['iphone-16-pro'];
    if (currentConfig.brand === 'samsung') {
      safeTop = 36;
      safeBottom = osMode === 'android' ? 42 : 20;
    } else if (currentConfig.brand === 'pixel') {
      safeTop = 38;
      safeBottom = osMode === 'android' ? 42 : 20;
    } else {
      safeTop = 42;
      safeBottom = 20;
    }
    return { top: safeTop, bottom: safeBottom };
  };

  const triggerFrameHandshake = () => {
    if (iframeRef.current?.contentWindow) {
      const insets = getSafeAreaInsets();
      iframeRef.current.contentWindow.postMessage({ 
        type: 'EMULATOR_INIT',
        mode: osMode,
        safeAreaTop: insets.top,
        safeAreaBottom: insets.bottom
      }, '*');
    }
  };

  const syncFrameEmulation = () => {
    if (iframeRef.current?.contentWindow) {
      const insets = getSafeAreaInsets();
      iframeRef.current.contentWindow.postMessage({ 
        type: 'EMULATOR_SYNC',
        mode: osMode,
        safeAreaTop: insets.top,
        safeAreaBottom: insets.bottom
      }, '*');
    }
  };

  // Synchronize on device or OS transitions
  useEffect(() => {
    syncFrameEmulation();
  }, [device, osMode]);

  // Resilient intervals to trigger handshake pings
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isConnected) {
        triggerFrameHandshake();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isConnected, osMode]);

  // Listen to frame messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Handshake Confirm
      if (event.data && event.data.type === 'EMULATOR_INIT_ACK') {
        setIsConnected(true);
        setIframeUrl(event.data.url);
      }

      // Keyboard Focus shifts
      if (event.data && event.data.type === 'KEYBOARD_TRIGGER') {
        const { status, bounds } = event.data;
        if (status === 'open' || status === 'update') {
          setKeyboardOpen(true);
          setInputBounds(bounds);
          // iOS Specific centering autoscroll offset trigger
          if (osMode === 'ios') {
            setTimeout(() => {
              if (iframeRef.current?.contentWindow) {
                iframeRef.current.contentWindow.postMessage({ type: 'KEYBOARD_SCROLL_ALIGN' }, '*');
              }
            }, 80);
          }
        } else if (status === 'close') {
          setKeyboardOpen(false);
          setInputBounds(null);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [osMode]);

  // Frame Nav triggers
  const handleFrameLoad = () => {
    setIsConnected(false);
    triggerFrameHandshake();
  };

  const handleOrientationToggle = () => {
    setOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait');
    setKeyboardOpen(false);
  };

  const handleLoadUrl = (newUrl: string) => {
    if (iframeRef.current) {
      iframeRef.current.src = newUrl;
      setIframeUrl(newUrl);
    }
  };

  const handleSoftBack = () => sendNavToFrame('back');
  const handleSoftHome = () => handleLoadUrl('https://www.google.com');
  const handleSoftRecents = () => setKeyboardOpen(prev => !prev);

  // Sync device selector switches to OS modes
  const handleDeviceChange = (dev: DeviceType) => {
    setDevice(dev);
    const config = DEVICES_CONFIG[dev];
    if (config) {
      setOsMode(config.os);
      // Auto-synchronize filter if the device chosen doesn't fit under the current filter
      if (osFilter !== 'all' && osFilter !== config.os) {
        setOsFilter('all');
      }
    }
    setKeyboardOpen(false);
  };

  const handleOsFilterChange = (filter: 'all' | 'ios' | 'android') => {
    setOsFilter(filter);
    
    // Auto-update emulated OS if filter is set specifically to ios or android
    if (filter === 'ios') {
      setOsMode('ios');
      // If the current device is Android, switch to the default iOS device
      const currentConfig = DEVICES_CONFIG[device];
      if (currentConfig && currentConfig.os !== 'ios') {
        setDevice('iphone-16-pro');
      }
    } else if (filter === 'android') {
      setOsMode('android');
      // If the current device is iOS, switch to the default Android device
      const currentConfig = DEVICES_CONFIG[device];
      if (currentConfig && currentConfig.os !== 'android') {
        setDevice('galaxy-s24-ultra');
      }
    }
  };

  const config = DEVICES_CONFIG[device] || DEVICES_CONFIG['iphone-16-pro'];
  const actualW = orientation === 'portrait' ? config.width : config.height;
  const actualH = orientation === 'portrait' ? config.height : config.width;
  const outerW = actualW + (config.bezel * 2);
  const outerH = actualH + (config.bezel * 2);

  return (
    <div id="app-container">
      {/* Control Bar Controls */}
      <ControlBar
        device={device}
        setDevice={handleDeviceChange}
        devicesConfig={DEVICES_CONFIG}
        osMode={osMode}
        setOsMode={setOsMode}
        osFilter={osFilter}
        setOsFilter={handleOsFilterChange}
        orientation={orientation}
        onOrientationToggle={handleOrientationToggle}
        onNav={sendNavToFrame}
        iframeUrl={iframeUrl}
        onLoadUrl={handleLoadUrl}
      />

      {/* Main Device Workspace */}
      <main id="emulator-main">
        <div id="device-scale-container">
          <div 
            id="device-wrapper" 
            className={`${orientation} ${config.chassisClass}`}
            style={{
              width: `${outerW}px`,
              height: `${outerH}px`,
              borderRadius: `${config.radius + config.bezel}px`
            }}
          >
            <div 
              className="device-bezel"
              style={{
                padding: `${config.bezel}px`,
                borderRadius: `${config.radius + config.bezel}px`,
                // Expose dynamic variables for the premium overlay frame bezel
                ['--dynamic-bezel-width' as any]: `${config.bezel}px`,
                ['--dynamic-bezel-radius' as any]: `${config.radius + config.bezel}px`
              }}
            >
              <div 
                id="viewport-container"
                style={{
                  borderRadius: `${config.radius}px`
                }}
              >
                {/* Systems Status Bar */}
                <StatusBars brand={config.brand} camera={config.camera} orientation={orientation} />

                {/* Workspace Frame with dynamic safe area padding */}
                <div 
                  id="iframe-wrapper"
                  style={{
                    paddingTop: `${getSafeAreaInsets().top}px`,
                    paddingBottom: `${keyboardOpen ? 0 : getSafeAreaInsets().bottom}px`
                  }}
                >
                  <iframe
                    ref={iframeRef}
                    id="target-frame"
                    src="about:blank"
                    onLoad={handleFrameLoad}
                    allow="camera; microphone; geolocation; fullscreen"
                  />
                </div>

                {/* Nav Home Indicators */}
                <SoftKeys
                  osMode={osMode}
                  onBack={handleSoftBack}
                  onHome={handleSoftHome}
                  onRecents={handleSoftRecents}
                />

                {/* Virtual Keyboard engine */}
                <VirtualKeyboard
                  osMode={osMode}
                  keyboardPage={keyboardPage}
                  setKeyboardPage={setKeyboardPage}
                  shiftActive={shiftActive}
                  setShiftActive={setShiftActive}
                  keyboardOpen={keyboardOpen}
                  onClose={() => setKeyboardOpen(false)}
                  sendInputToFrame={sendInputToFrame}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Diagnostics Status Bar */}
      <div id="diagnostic-bar">
        <div>
          <span className="status-label">Device Status: </span>
          <span 
            className="status-value" 
            style={{ color: isConnected ? '#34c759' : '#ff9500' }}
          >
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            id="btn-instructions" 
            onClick={() => setShowInstructions(true)}
            style={{ marginRight: '8px' }}
          >
            Instructions
          </button>
          <button id="btn-toggle-keyboard" onClick={() => setKeyboardOpen(p => !p)}>
            <svg viewBox="0 0 640 640" width="15" height="15" fill="currentColor" style={{ opacity: 0.85, display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }}>
              <path d="M96 128C60.7 128 32 156.7 32 192L32 448C32 483.3 60.7 512 96 512L544 512C579.3 512 608 483.3 608 448L608 192C608 156.7 579.3 128 544 128L96 128zM112 192L144 192C152.8 192 160 199.2 160 208L160 240C160 248.8 152.8 256 144 256L112 256C103.2 256 96 248.8 96 240L96 208C96 199.2 103.2 192 112 192zM96 304C96 295.2 103.2 288 112 288L144 288C152.8 288 160 295.2 160 304L160 336C160 344.8 152.8 352 144 352L112 352C103.2 352 96 344.8 96 336L96 304zM208 192L240 192C248.8 192 256 199.2 256 208L256 240C256 248.8 248.8 256 240 256L208 256C199.2 256 192 248.8 192 240L192 208C192 199.2 199.2 192 208 192zM192 304C192 295.2 199.2 288 208 288L240 288C248.8 288 256 295.2 256 304L256 336C256 344.8 248.8 352 240 352L208 352C199.2 352 192 344.8 192 336L192 304zM208 384L432 384C440.8 384 448 391.2 448 400L448 432C448 440.8 440.8 448 432 448L208 448C199.2 448 192 440.8 192 432L192 400C192 391.2 199.2 384 208 384zM288 208C288 199.2 295.2 192 304 192L336 192C344.8 192 352 199.2 352 208L352 240C352 248.8 344.8 256 336 256L304 256C295.2 256 288 248.8 288 240L288 208zM304 288L336 288C344.8 288 352 295.2 352 304L352 336C352 344.8 344.8 352 336 352L304 352C295.2 352 288 344.8 288 336L288 304C288 295.2 295.2 288 304 288zM384 208C384 199.2 391.2 192 400 192L432 192C440.8 192 448 199.2 448 208L448 240C448 248.8 440.8 256 432 256L400 256C391.2 256 384 248.8 384 240L384 208zM400 288L432 288C440.8 288 448 295.2 448 304L448 336C448 344.8 440.8 352 432 352L400 352C391.2 352 384 344.8 384 336L384 304C384 295.2 391.2 288 400 288zM480 208C480 199.2 487.2 192 496 192L528 192C536.8 192 544 199.2 544 208L544 240C544 248.8 536.8 256 528 256L496 256C487.2 256 480 248.8 480 240L480 208zM496 288L528 288C536.8 288 544 295.2 544 304L544 336C544 344.8 536.8 352 528 352L496 352C487.2 352 480 344.8 480 336L480 304C480 295.2 487.2 288 496 288z"/>
            </svg>
            Toggle Keyboard (Debug)
          </button>
        </div>
      </div>

      {showInstructions && (
        <div className="instructions-overlay" onClick={() => setShowInstructions(false)}>
          <div className="instructions-modal" onClick={(e) => e.stopPropagation()}>
            <div className="instructions-header">
              <h3>📱 Simulator Guide & Tips</h3>
              <button className="instructions-close" onClick={() => setShowInstructions(false)}>&times;</button>
            </div>
            <div className="instructions-body">
              <div className="instruction-item">
                <span className="instruction-icon">🖱️</span>
                <div className="instruction-text">
                  <h4>Drag to Scroll (Reels & Shorts)</h4>
                  <p>Scroll Reels, Stories, or YouTube Shorts natively by dragging your mouse up or down directly inside the phone screen, simulating standard mobile touch/swipe gestures!</p>
                </div>
              </div>
              <div className="instruction-item">
                <span className="instruction-icon">↔️</span>
                <div className="instruction-text">
                  <h4>Horizontal Side-Scrolling</h4>
                  <p>To scroll sideways in horizontal lists, carousels, or filter chips, hold the <strong>Shift</strong> key on your computer keyboard while using your mouse scroll wheel.</p>
                </div>
              </div>
              <div className="instruction-item">
                <span className="instruction-icon">⌨️</span>
                <div className="instruction-text">
                  <h4>Virtual Keyboard Emulation</h4>
                  <p>Click on any text input field inside the website to open the realistic Gboard or iOS keyboard! Type directly by clicking simulated keys or use your physical desktop keyboard.</p>
                </div>
              </div>
              <div className="instruction-item">
                <span className="instruction-icon">🔄</span>
                <div className="instruction-text">
                  <h4>Orientation Rotation</h4>
                  <p>Toggle the Portrait/Landscape segmented switch in the top control bar to rotate the device chassis with auto-centered dynamic notches, punches, and safe areas.</p>
                </div>
              </div>
            </div>
            <div className="instructions-footer">
              <button className="btn-close-modal" onClick={() => setShowInstructions(false)}>Got it!</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
