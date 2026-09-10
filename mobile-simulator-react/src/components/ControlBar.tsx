import React, { useState, useEffect, useRef } from 'react';

interface ControlBarProps {
  device: string;
  setDevice: (dev: any) => void;
  devicesConfig: Record<string, { name: string; os: 'ios' | 'android' }>;
  osMode: 'ios' | 'android';
  setOsMode: (mode: 'ios' | 'android') => void;
  osFilter: 'all' | 'ios' | 'android';
  setOsFilter: (filter: 'all' | 'ios' | 'android') => void;
  orientation: 'portrait' | 'landscape';
  onOrientationToggle: () => void;
  onNav: (action: 'back' | 'forward' | 'refresh') => void;
  iframeUrl: string;
  onLoadUrl: (url: string) => void;
  isPremium?: boolean;
  onPremiumTrigger?: () => void;
}

const isFreeDevice = (devId: string) => {
  return devId === 'iphone-16' || devId === 'pixel-9' || devId === 'galaxy-s24';
};

const BrandIcon: React.FC<{ os: string; name: string }> = ({ os, name }) => {
  const lowercaseName = name.toLowerCase();
  
  if (os === 'ios') {
    return (
      <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-.1 3.81.47 1.55.57 2.13 1.51 2.43 2.11-3.07 1.63-2.58 5.68.74 7.07l.37.1zM15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.22.67-2.94 1.5-.62.71-1.16 1.85-1.01 2.96 1.12.09 2.27-.58 2.96-1.4z"/>
      </svg>
    );
  }
  
  if (lowercaseName.includes('pixel') || lowercaseName.includes('google')) {
    return (
      <svg viewBox="0 0 24 24" width="13" height="13" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
      </svg>
    );
  }
  
  if (lowercaseName.includes('galaxy') || lowercaseName.includes('samsung')) {
    return (
      <svg viewBox="0 0 54 10" width="38" height="10" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
        <text x="27" y="8" fill="#0A46A9" fontSize="8" fontWeight="800" fontFamily='"Inter", "Helvetica Neue", Arial, sans-serif' textAnchor="middle" letterSpacing="0.8">SAMSUNG</text>
      </svg>
    );
  }
  
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="#34A853" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M17.52 14.37c-.52 0-.94-.42-.94-.94s.42-.94.94-.94.94.42.94.94-.42.94-.94.94zm-11.04 0c-.52 0-.94-.42-.94-.94s.42-.94.94-.94.94.42.94.94-.42.94-.94.94zm11.4-5.3l1.86-3.22c.1-.18.04-.41-.14-.51-.18-.1-.41-.04-.51.14l-1.88 3.26C15.61 8.28 13.88 8 12 8s-3.61.28-5.21.74L4.9 5.48c-.1-.18-.33-.24-.51-.14-.18.1-.24.33-.14.51l1.86 3.22C3.12 10.96 1 14.19 1 18h22c0-3.81-2.12-7.04-5.08-8.93z"/>
    </svg>
  );
};

export const ControlBar: React.FC<ControlBarProps> = ({
  device,
  setDevice,
  devicesConfig,
  osMode,
  setOsMode,
  osFilter,
  setOsFilter,
  orientation,
  onOrientationToggle,
  onNav,
  iframeUrl,
  onLoadUrl,
  isPremium,
  onPremiumTrigger
}) => {
  const [localUrl, setLocalUrl] = useState(iframeUrl);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Keep search bar in sync when iframe shifts pages internally
  useEffect(() => {
    setLocalUrl(iframeUrl);
  }, [iframeUrl]);

  // Click outside close logic
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGo = () => {
    let url = localUrl.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    setLocalUrl(url);
    onLoadUrl(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGo();
    }
  };

  const filteredDevices = Object.entries(devicesConfig).filter(([_, cfg]) => {
    if (osFilter === 'all') return true;
    return cfg.os === osFilter;
  });

  const selectedDeviceConfig = devicesConfig[device];

  return (
    <header id="control-bar">
      <div className="controls-row">
        <div className="controls-left">
          {/* Custom Modern Dropdown Selector */}
          <div className="custom-dropdown-container" ref={dropdownRef}>
            <button 
              className={`custom-dropdown-trigger ${isOpen ? 'open' : ''}`}
              onClick={() => setIsOpen(!isOpen)}
              title="Select Emulated Device"
            >
              <span className="device-brand-icon">
                <BrandIcon os={selectedDeviceConfig?.os || 'ios'} name={selectedDeviceConfig?.name || ''} />
              </span>
              <span className="selected-device-name">
                {selectedDeviceConfig?.name || device}
              </span>
              <span className="chevron-arrow">
                <svg className={`chevron-arrow-svg ${isOpen ? 'open' : ''}`} viewBox="0 0 640 640" width="10" height="10" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle', transition: 'transform 0.2s ease', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <path d="M297.4 438.6C309.9 451.1 330.2 451.1 342.7 438.6L502.7 278.6C515.2 266.1 515.2 245.8 502.7 233.3C490.2 220.8 469.9 220.8 457.4 233.3L320 370.7L182.6 233.4C170.1 220.9 149.8 220.9 137.3 233.4C124.8 245.9 124.8 266.2 137.3 278.7L297.3 438.7z"/>
                </svg>
              </span>
            </button>

            {isOpen && (
              <div className="custom-dropdown-menu">
                {filteredDevices.map(([key, cfg]) => {
                  return (
                    <button
                      key={key}
                      className={`custom-dropdown-item ${device === key ? 'active' : ''}`}
                      onClick={() => {
                        setDevice(key);
                        setIsOpen(false);
                      }}
                    >
                      <span className="item-brand-icon">
                        <BrandIcon os={cfg.os} name={cfg.name} />
                      </span>
                      <span className="item-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {cfg.name}
                      </span>
                      {device === key && <span className="check-indicator">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* 3-Way Device Platform Filter Toggles */}
          <div className="mode-toggles">
            <button 
              className={osFilter === 'all' ? 'active' : ''} 
              onClick={() => setOsFilter('all')}
              title="Show All Devices"
            >
              All
            </button>
            <button 
              className={osFilter === 'ios' ? 'active' : ''} 
              onClick={() => setOsFilter('ios')}
              title="Filter to iOS Devices"
            >
              iOS
            </button>
            <button 
              className={osFilter === 'android' ? 'active' : ''} 
              onClick={() => setOsFilter('android')}
              title="Filter to Android Devices"
            >
              Android
            </button>
          </div>
        </div>

        <div className="controls-right">
          {/* State-Aware Segmented Orientation Toggle Row */}
          <div className="orientation-toggles-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" style={{ opacity: 0.7, flexShrink: 0 }}>
              <path d="M11 2.1c2 0 3 1.3 3 2.9h-1l1.5 2L16 5h-1c0-2.2-2-3.9-4-3.9V0L9 1.5L11 3v-.9z"/>
              <path d="M9 9h6v6H8V0H0v16h16V8H9v1zM7 8H6v1h1v6H1V1h6v7z"/>
              <path d="M2 8h1v1H2V8zm2 0h1v1H4V8z"/>
            </svg>
            <div className="orientation-toggles">
              <button 
                className={orientation === 'portrait' ? 'active' : ''} 
                onClick={() => orientation !== 'portrait' && onOrientationToggle()}
                title="Portrait Orientation"
              >
                Portrait
              </button>
              <button 
                className={orientation === 'landscape' ? 'active' : ''} 
                onClick={() => orientation !== 'landscape' && onOrientationToggle()}
                title="Landscape Orientation"
                style={{ position: 'relative' }}
              >
                Landscape
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="url-bar">
        <button 
          className="nav-btn" 
          onClick={() => onNav('back')} 
          title="Back"
        >
          <svg viewBox="0 0 640 640" width="14" height="14" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle', transform: 'rotate(90deg)', transformOrigin: 'center' }}>
            <path d="M297.4 438.6C309.9 451.1 330.2 451.1 342.7 438.6L502.7 278.6C515.2 266.1 515.2 245.8 502.7 233.3C490.2 220.8 469.9 220.8 457.4 233.3L320 370.7L182.6 233.4C170.1 220.9 149.8 220.9 137.3 233.4C124.8 245.9 124.8 266.2 137.3 278.7L297.3 438.7z"/>
          </svg>
        </button>
        <button 
          className="nav-btn" 
          onClick={() => onNav('forward')} 
          title="Forward"
        >
          <svg viewBox="0 0 640 640" width="14" height="14" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle', transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
            <path d="M297.4 438.6C309.9 451.1 330.2 451.1 342.7 438.6L502.7 278.6C515.2 266.1 515.2 245.8 502.7 233.3C490.2 220.8 469.9 220.8 457.4 233.3L320 370.7L182.6 233.4C170.1 220.9 149.8 220.9 137.3 233.4C124.8 245.9 124.8 266.2 137.3 278.7L297.3 438.7z"/>
          </svg>
        </button>
        <button 
          className="nav-btn" 
          onClick={() => onNav('refresh')} 
          title="Refresh"
        >
          <svg viewBox="0 0 640 640" width="14" height="14" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
            <path d="M500.7 138.7L512 149.4L512 96C512 78.3 526.3 64 544 64C561.7 64 576 78.3 576 96L576 224C576 241.7 561.7 256 544 256L416 256C398.3 256 384 241.7 384 224C384 206.3 398.3 192 416 192L463.9 192L456.3 184.8C456.1 184.6 455.9 184.4 455.7 184.2C380.7 109.2 259.2 109.2 184.2 184.2C109.2 259.2 109.2 380.7 184.2 455.7C259.2 530.7 380.7 530.7 455.7 455.7C463.9 447.5 471.2 438.8 477.6 429.6C487.7 415.1 507.7 411.6 522.2 421.7C536.7 431.8 540.2 451.8 530.1 466.3C521.6 478.5 511.9 490.1 501 501C401 601 238.9 601 139 501C39.1 401 39 239 139 139C238.9 39.1 400.7 39 500.7 138.7z"/>
          </svg>
        </button>
        <input 
          type="url" 
          id="url-input" 
          placeholder="Enter URL (e.g., google.com)" 
          value={localUrl}
          onChange={(e) => setLocalUrl(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button id="btn-go" onClick={handleGo}>Go</button>
      </div>
    </header>
  );
};

export default ControlBar;
