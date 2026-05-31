import React, { useState, useEffect } from 'react';

interface StatusBarsProps {
  brand: 'apple' | 'samsung' | 'pixel';
  camera: 'dynamic-island' | 'camera-punch' | 'iphone-notch' | 'iphone-notch-narrow';
  orientation: 'portrait' | 'landscape';
}

export const StatusBars: React.FC<StatusBarsProps> = ({ brand, camera, orientation }) => {
  const [timeState, setTimeState] = useState({
    apple: '9:41',
    samsung: '1:40',
    pixel: '9:30'
  });

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      
      // Apple, Samsung, Pixel: standard 12-hour format without leading zero and without AM/PM
      let hours = d.getHours() % 12;
      hours = hours ? hours : 12;
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;

      setTimeState({
        apple: timeStr,
        samsung: timeStr,
        pixel: timeStr
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const renderCamera = () => {
    if (camera === 'dynamic-island') {
      return (
        <div className={`dynamic-island-container ${orientation}`}>
          <div className="dynamic-island" id="ios-dynamic-island">
            <div className="camera-lens"></div>
          </div>
        </div>
      );
    }
    
    if (camera === 'camera-punch') {
      return (
        <div className={`camera-punch-container ${orientation}`}>
          <div className="camera-punch"></div>
        </div>
      );
    }

    if (camera === 'iphone-notch') {
      return (
        <div className={`iphone-notch-container ${orientation}`}>
          <div className="iphone-notch">
            <div className="camera-lens" style={{ width: '8px', height: '8px' }}></div>
            <div className="speaker-earpiece"></div>
          </div>
        </div>
      );
    }

    if (camera === 'iphone-notch-narrow') {
      return (
        <div className={`iphone-notch-container ${orientation}`}>
          <div className="iphone-notch-narrow">
            <div className="camera-lens" style={{ width: '7px', height: '7px' }}></div>
            <div className="speaker-earpiece-narrow"></div>
          </div>
        </div>
      );
    }

    return null;
  };

  if (brand === 'apple') {
    return (
      <>
        <div className={`status-bar apple-status-bar ${orientation}`}>
          <div className="status-time" id="apple-clock">{timeState.apple}</div>
          
          <div className="status-icons">
            {/* iOS Signal strength bars */}
            <span className="status-icon signal">
              <svg className="status-svg" width="17" height="11" viewBox="0 0 17 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="8" width="3" height="3" rx="1" fill="currentColor" />
                <rect x="4.5" y="6" width="3" height="5" rx="1" fill="currentColor" />
                <rect x="9" y="3" width="3" height="8" rx="1" fill="currentColor" />
                <rect x="13.5" y="0" width="3" height="11" rx="1" fill="currentColor" />
              </svg>
            </span>
            {/* iOS Wi-Fi Curved arcs */}
            <span className="status-icon wifi">
              <svg className="status-svg" width="15" height="11" viewBox="0 0 15 11" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.5 11C8.32843 11 9 10.3284 9 9.5C9 8.67157 8.32843 8 7.5 8C6.67157 8 6 8.67157 6 9.5C6 10.3284 6.67157 11 7.5 11Z" />
                <path fillRule="evenodd" clipRule="evenodd" d="M7.5 5.5C8.895 5.5 10.21 6.015 11.23 6.87C11.515 7.11 11.935 7.075 12.175 6.79C12.415 6.505 12.38 6.085 12.095 5.845C10.825 4.775 9.185 4.15 7.5 4.15C5.815 4.15 4.175 4.775 2.905 5.845C2.62 6.085 2.585 6.505 2.825 6.79C3.065 7.075 3.485 7.11 3.77 6.87C4.79 6.015 6.105 5.5 7.5 5.5Z" />
                <path fillRule="evenodd" clipRule="evenodd" d="M7.5 1.5C9.725 1.5 11.83 2.32 13.46 3.695C13.745 3.935 14.165 3.9 14.405 3.615C14.645 3.33 14.61 2.91 14.325 2.67C12.415 1.06 9.95 0.15 7.5 0.15C5.05 0.15 2.585 1.06 0.675 2.67C0.39 2.91 0.355 3.33 0.595 3.615C0.835 3.9 1.255 3.935 1.54 3.695C3.17 2.32 5.275 1.5 7.5 1.5Z" />
              </svg>
            </span>
            {/* iOS Battery outline & fill */}
            <span className="status-icon battery">
              <svg className="status-svg" width="24" height="12" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0.5" y="0.5" width="20" height="11" rx="3" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.85" />
                <path d="M22 4C22.5 4 22.8 4.3 22.8 4.8V7.2C22.8 7.7 22.5 8 22 8V4Z" fill="currentColor" fillOpacity="0.85" />
                <rect x="2.5" y="2.5" width="16" height="7" rx="1.5" fill="currentColor" />
              </svg>
            </span>
          </div>
        </div>
        {renderCamera()}
      </>
    );
  }

  if (brand === 'samsung') {
    return (
      <>
        <div className={`status-bar samsung-status-bar ${orientation}`}>
          <div className="status-time" id="samsung-clock">{timeState.samsung}</div>
          
          <div className="status-icons">
            {/* Samsung VoLTE Text badge */}
            <span className="samsung-volte-badge">VoLTE</span>
            
            {/* Samsung Wi-Fi */}
            <span className="status-icon wifi">
              <svg className="status-svg" width="15" height="12" viewBox="0 0 15 12" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M7.5 1C10.22 1 12.72 2.05 14.59 3.77C14.86 4.02 14.88 4.43 14.64 4.7L7.96 11.39C7.71 11.64 7.29 11.64 7.04 11.39L0.36 4.7C0.12 4.43 0.14 4.02 0.41 3.77C2.28 2.05 4.78 1 7.5 1Z" />
              </svg>
            </span>
            
            {/* Samsung Signal Triangle */}
            <span className="status-icon signal">
              <svg className="status-svg" width="13" height="12" viewBox="0 0 13 12" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0H11C10.45 0 10 0.45 10 1V11H0C0 11.55 0.45 12 1 12H12C12.55 12 13 11.55 13 11V1C13 0.45 12.55 0 12 0Z" opacity="0.3" />
                <path d="M12 12V2.5L2.5 12H12Z" />
              </svg>
            </span>
            
            {/* Samsung Battery Pill containing "100" numerical text overlay */}
            <span className="status-icon battery">
              <svg className="status-svg samsung-battery-icon" width="28" height="13" viewBox="0 0 28 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0.5" y="0.5" width="27" height="12" rx="6" stroke="currentColor" strokeWidth="1" />
                <rect x="2" y="2" width="24" height="9" rx="4.5" fill="currentColor" />
                <text x="14" y="9.5" fontFamily="inherit" fontSize="8px" fontWeight="800" fill="var(--bg-panel, #ffffff)" textAnchor="middle">100</text>
              </svg>
            </span>
          </div>
        </div>
        {renderCamera()}
      </>
    );
  }

  // Google Pixel Brand
  return (
    <>
      <div className={`status-bar pixel-status-bar ${orientation}`}>
        <div className="status-time" id="pixel-clock">{timeState.pixel}</div>
        
        <div className="status-icons">
          {/* Pixel "5G" Network Type badge */}
          <span className="pixel-network-badge">5G</span>
          
          {/* Pixel Signal Strength Triangle */}
          <span className="status-icon signal">
            <svg className="status-svg" width="13" height="12" viewBox="0 0 13 12" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 12H12C12.55 12 13 11.55 13 11V0.5L0.5 13H1C0.5 13 1 12 1 12Z" opacity="0.3" />
              <path d="M12 12V3L3 12H12Z" />
            </svg>
          </span>
          
          {/* Pixel Vertical Solid Battery Pill */}
          <span className="status-icon battery">
            <svg className="status-svg pixel-battery-icon" width="10" height="15" viewBox="0 0 10 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0.5" y="2.5" width="9" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
              <rect x="3" y="0.5" width="4" height="2" rx="0.5" fill="currentColor" />
              <rect x="2" y="4.5" width="6" height="9" rx="0.5" fill="currentColor" />
            </svg>
          </span>
        </div>
      </div>
      {renderCamera()}
    </>
  );
};
