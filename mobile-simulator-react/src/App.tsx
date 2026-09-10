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
  // Global Emulator React States
  const [device, setDevice] = useState<DeviceType>('iphone-16');
  const [osMode, setOsMode] = useState<OsModeType>('ios');
  const [osFilter, setOsFilter] = useState<'all' | 'ios' | 'android'>('all');
  const [orientation, setOrientation] = useState<OrientationType>('portrait');
  const [keyboardPage, setKeyboardPage] = useState<'abc' | 'ABC' | 'num' | 'sym' | 'emoji'>('abc');
  const [shiftActive, setShiftActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [iframeUrl, setIframeUrl] = useState('https://www.google.com');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [_inputBounds, setInputBounds] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // --- DNR Emulation & Body Class Syncing ---
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).chrome && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'SET_EMULATION_MODE', mode: osMode }, (response: any) => {
        if (chrome.runtime.lastError) {
          console.warn('[Emulator React App] Storage/DNR communication error:', chrome.runtime.lastError.message);
        } else {
          console.log('[Emulator React App] DNR and Storage synchronized for:', response?.mode);
        }
      });
    }

    setKeyboardPage('abc');
    setShiftActive(false);
  }, [osMode]);

  useEffect(() => {
    document.body.className = `${osMode}-mode ${keyboardOpen ? 'keyboard-open' : ''} premium-active`;
  }, [osMode, keyboardOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).chrome && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
        const activeTab = tabs && tabs[0];
        if (activeTab && activeTab.url) {
          const url = activeTab.url.trim();
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

  // --- Fit Scaling ---
  const adjustDeviceScale = () => {
    const container = document.getElementById('emulator-main');
    const wrapper = document.getElementById('device-wrapper');
    const scaleContainer = document.getElementById('device-scale-container');
    if (!container || !wrapper || !scaleContainer) return;

    const config = DEVICES_CONFIG[device];
    if (!config) return;

    const containerW = container.clientWidth - 40;
    const containerH = container.clientHeight - 40;

    let naturalW = config.width + (config.bezel * 2);
    let naturalH = config.height + (config.bezel * 2);

    if (orientation === 'landscape') {
      const temp = naturalW;
      naturalW = naturalH;
      naturalH = temp;
    }

    const scaleX = containerW / naturalW;
    const scaleY = containerH / naturalH;
    const scale = Math.min(scaleX, scaleY, 1);

    scaleContainer.style.width = `${naturalW * scale}px`;
    scaleContainer.style.height = `${naturalH * scale}px`;
    wrapper.style.transform = `scale(${scale})`;
  };

  useEffect(() => {
    const container = document.getElementById('emulator-main');
    if (!container) return;

    adjustDeviceScale();

    const observer = new ResizeObserver(() => {
      adjustDeviceScale();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [device, orientation, osMode]);

  // --- Communication with frame ---
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
    
    const currentConfig = DEVICES_CONFIG[device] || DEVICES_CONFIG['iphone-16'];
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

  useEffect(() => {
    syncFrameEmulation();
  }, [device, osMode]);

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
      if (event.data && event.data.type === 'EMULATOR_INIT_ACK') {
        setIsConnected(true);
        setIframeUrl(event.data.url);
      }

      if (event.data && event.data.type === 'KEYBOARD_TRIGGER') {
        const { status, bounds } = event.data;
        if (status === 'open' || status === 'update') {
          setKeyboardOpen(true);
          setInputBounds(bounds);
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

  const handleCloseKeyboard = () => {
    setKeyboardOpen(false);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'KEYBOARD_BLUR' }, '*');
    }
  };

  const handleDeviceChange = (dev: DeviceType) => {
    setDevice(dev);
    const config = DEVICES_CONFIG[dev];
    if (config) {
      setOsMode(config.os);
      if (osFilter !== 'all' && osFilter !== config.os) {
        setOsFilter('all');
      }
    }
    setKeyboardOpen(false);
  };

  const handleOsFilterChange = (filter: 'all' | 'ios' | 'android') => {
    setOsFilter(filter);
    
    if (filter === 'ios') {
      setOsMode('ios');
      const currentConfig = DEVICES_CONFIG[device];
      if (currentConfig && currentConfig.os !== 'ios') {
        setDevice('iphone-16-pro');
      }
    } else if (filter === 'android') {
      setOsMode('android');
      const currentConfig = DEVICES_CONFIG[device];
      if (currentConfig && currentConfig.os !== 'android') {
        setDevice('galaxy-s24-ultra');
      }
    }
  };

  const config = DEVICES_CONFIG[device] || DEVICES_CONFIG['iphone-16'];
  const actualW = orientation === 'portrait' ? config.width : config.height;
  const actualH = orientation === 'portrait' ? config.height : config.width;
  const outerW = actualW + (config.bezel * 2);
  const outerH = actualH + (config.bezel * 2);

  return (
    <div id="app-container" className="premium-mode">
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

                {/* Workspace Frame with dynamic safe area padding - Unlocked for everyone */}
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
                  onClose={handleCloseKeyboard}
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
            Toggle Keyboard (Debug)
          </button>
        </div>
      </div>

      {/* High-Fidelity Creator Credit Footer Section */}
      <div className="bottom-creator-footer">
        <a 
          href="https://avineshrv.github.io/web-portfolio" 
          target="_blank" 
          rel="noopener noreferrer"
          className="bottom-creator-link"
          title="Made by Avinesh"
        >
          <svg viewBox="0 0 1024 544" className="bottom-creator-logo-svg">
            <path d="M554.274292,299.250183 C519.558350,337.603271 478.020294,365.608002 430.765137,385.283508 C424.624756,387.840179 420.449219,391.230255 418.399597,397.663666 C416.687042,403.039124 414.155182,408.154480 411.966431,413.376770 C411.106659,415.428162 410.131195,417.310303 407.410675,417.298859 C393.914917,417.242126 380.418976,417.232880 366.923218,417.176697 C366.461029,417.174774 366.000153,416.851685 365.564453,416.687988 C364.656189,414.834320 365.841034,413.443756 366.491486,411.970551 C394.209930,349.191559 422.031952,286.457947 449.524536,223.580261 C452.449829,216.889847 455.801575,213.857437 463.466553,214.471954 C473.400940,215.268387 483.450043,214.714828 493.447845,214.589508 C496.409302,214.552399 498.448975,215.233170 499.750366,218.212433 C507.150421,235.153336 514.691223,252.032745 522.188354,268.931244 C522.879395,270.488800 523.506714,271.988953 522.146301,273.568756 C513.644104,283.441895 503.839233,291.848328 492.917511,300.218353 C486.196472,287.606781 481.815063,274.579712 475.322784,261.290680 C464.246002,288.217407 453.595917,314.106812 442.414459,341.287964 C450.778503,337.916016 457.450653,334.295624 464.021423,330.504700 C500.127594,309.673828 529.240112,281.282867 553.971191,247.971619 C577.282776,216.572464 596.823242,182.865982 615.796387,148.795761 C617.970337,144.892075 620.404236,143.435699 624.815369,143.498062 C635.136536,143.643921 645.476624,144.007874 655.792236,143.146469 C659.259644,142.856949 661.137390,143.636276 660.279846,147.880844 C650.235962,197.596664 640.300781,247.334488 630.357971,297.070709 C626.967346,314.031311 623.499756,330.978668 620.368713,347.987549 C619.538940,352.494934 617.752136,354.051392 613.102661,353.815216 C605.469849,353.427521 597.798523,353.798920 590.143433,353.848145 C588.644836,353.857788 587.129211,353.932098 585.228699,352.329712 C591.063782,312.532013 596.963013,272.296783 602.862183,232.061539 C588.049255,255.435547 572.718079,278.240234 554.274292,299.250183 Z" />
            <path d="M536.074463,329.076050 C539.228210,326.631409 541.157166,323.317444 544.428894,321.642853 C546.553894,322.183716 546.749207,324.058960 547.392029,325.500793 C553.968079,340.248779 560.496033,355.018219 567.029419,369.785217 C567.990173,371.956879 568.456299,373.977264 567.283325,376.433167 C561.062744,389.457550 561.393555,402.141876 569.777405,414.256592 C570.137207,414.776489 570.286255,415.442169 570.496338,415.950165 C569.691223,417.738342 568.180725,417.304474 566.954590,417.314148 C559.792908,417.370575 552.629089,417.259460 545.469238,417.388519 C542.634338,417.439606 540.785095,416.565155 539.615173,413.853027 C530.781616,393.375458 521.895142,372.920563 512.951538,352.490845 C511.823883,349.915100 512.955688,348.526154 514.789001,347.005219 C521.837524,341.157837 528.807373,335.215637 536.074463,329.076050 Z" />
            <path d="M573.234497,385.611206 C577.873596,373.042450 588.859619,366.177124 600.909302,368.026672 C612.816284,369.854309 621.492310,379.954041 622.192322,392.802002 C622.804199,404.033783 615.034546,414.634399 603.906311,417.750549 C586.540527,422.613342 569.740112,407.747559 572.451538,389.915100 C572.650818,388.604370 572.878784,387.297943 573.234497,385.611206 Z" />
          </svg>
          <span className="bottom-creator-text">Made by Avinesh</span>
        </a>
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
