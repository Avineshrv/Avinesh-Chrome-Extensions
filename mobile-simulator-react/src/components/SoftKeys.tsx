import React from 'react';

interface SoftKeysProps {
  osMode: 'ios' | 'android';
  onBack: () => void;
  onHome: () => void;
  onRecents: () => void;
}

export const SoftKeys: React.FC<SoftKeysProps> = ({ osMode, onBack, onHome, onRecents }) => {
  if (osMode === 'ios') {
    return (
      <div className="home-indicator ios-home-indicator" id="ios-home-pill">
        <div className="home-bar"></div>
      </div>
    );
  }

  return (
    <div className="home-indicator android-nav-bar" id="android-nav-keys">
      <button className="nav-key back-key" onClick={onBack} title="Back">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor">
          <path d="M16 5l-8 7 8 7V5z"/>
        </svg>
      </button>
      <button className="nav-key home-key" onClick={onHome} title="Home">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor">
          <circle cx="12" cy="12" r="5.5"/>
        </svg>
      </button>
      <button className="nav-key recents-key" onClick={onRecents} title="Recents">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor">
          <rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/>
        </svg>
      </button>
    </div>
  );
};
