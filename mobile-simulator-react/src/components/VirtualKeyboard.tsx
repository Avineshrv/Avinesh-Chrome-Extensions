import React, { useState } from 'react';

interface VirtualKeyboardProps {
  osMode: 'ios' | 'android';
  keyboardPage: 'abc' | 'ABC' | 'num' | 'sym' | 'emoji';
  setKeyboardPage: (page: 'abc' | 'ABC' | 'num' | 'sym' | 'emoji') => void;
  shiftActive: boolean;
  setShiftActive: (active: boolean) => void;
  keyboardOpen: boolean;
  onClose: () => void;
  sendInputToFrame: (data: { char?: string | null; action?: string }) => void;
  isPremium: boolean;
  onPremiumTrigger?: () => void;
}

interface SpecialKey {
  type: string;
  label: string;
}

type KeyItem = string | SpecialKey;

const EMOJIS = [
  '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰',
  '😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏',
  '😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠',
  '😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥',
  '😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐',
  '🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','👻','💀',
  '☠️','👽','👾','🤖','🎃','😺','😸','😻','😽','😼','🙀','😿','😾','👋','🤚','🖐️',
  '✋','🖖','👌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍',
  '👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💖','💗','💓','💞'
];

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  osMode,
  keyboardPage,
  setKeyboardPage,
  shiftActive,
  setShiftActive,
  keyboardOpen,
  onClose,
  sendInputToFrame,
  isPremium,
  onPremiumTrigger
}) => {
  // Local Keyboard Theme State - Default to OS prefers-color-scheme
  const [keyboardTheme, setKeyboardTheme] = useState<'light' | 'dark' | 'night'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  // --- Pixel-Perfect Independent iOS & Android Layouts ---
  const KEYBOARD_LAYOUTS: Record<string, KeyItem[][]> = {
    // --- iOS KEYBOARD LAYOUTS ---
    ios_abc: [
      ['q','w','e','r','t','y','u','i','o','p'],
      ['a','s','d','f','g','h','j','k','l'],
      [{type:'shift', label:'⇧'}, 'z','x','c','v','b','n','m', {type:'backspace', label:'⌫'}],
      [{type:'switch-123', label:'123'}, {type:'space', label:''}, {type:'enter', label:'return'}]
    ],
    ios_ABC: [
      ['Q','W','E','R','T','Y','U','I','O','P'],
      ['A','S','D','F','G','H','J','K','L'],
      [{type:'shift-active', label:'⇪'}, 'Z','X','C','V','B','N','M', {type:'backspace', label:'⌫'}],
      [{type:'switch-123', label:'123'}, {type:'space', label:''}, {type:'enter', label:'return'}]
    ],
    ios_num: [
      ['1','2','3','4','5','6','7','8','9','0'],
      ['-','/',':',';','(',')','$', '&', '@', '"'],
      [{type:'switch-symbols', label:'#+='}, '.',',','?','!',"'", {type:'backspace', label:'⌫'}],
      [{type:'switch-abc', label:'ABC'}, {type:'space', label:''}, {type:'enter', label:'return'}]
    ],
    ios_sym: [
      ['[',']','{','}','#','%','^','*','+','='],
      ['_','\\','|','~','<','>','€','£','¥','•'],
      [{type:'switch-num', label:'123'}, '.',',','?','!',"'", {type:'backspace', label:'⌫'}],
      [{type:'switch-abc', label:'ABC'}, {type:'space', label:''}, {type:'enter', label:'return'}]
    ],

    // --- ANDROID GBOARD LAYOUTS ---
    android_abc: [
      ['q','w','e','r','t','y','u','i','o','p'],
      ['a','s','d','f','g','h','j','k','l'],
      [{type:'shift', label:'⇧'}, 'z','x','c','v','b','n','m', {type:'backspace', label:'⌫'}],
      [{type:'switch-123', label:'?123'}, {type:'comma', label:','}, {type:'space', label:'English'}, {type:'period', label:'.'}, {type:'enter', label:'↵'}]
    ],
    android_ABC: [
      ['Q','W','E','R','T','Y','U','I','O','P'],
      ['A','S','D','F','G','H','J','K','L'],
      [{type:'shift-active', label:'⇪'}, 'Z','X','C','V','B','N','M', {type:'backspace', label:'⌫'}],
      [{type:'switch-123', label:'?123'}, {type:'comma', label:','}, {type:'space', label:'English'}, {type:'period', label:'.'}, {type:'enter', label:'↵'}]
    ],
    android_num: [
      ['1','2','3','4','5','6','7','8','9','0'],
      ['@','#','$','_','&','-','+','(',')','/'],
      [{type:'switch-symbols', label:'=\\<'}, '*','"',':',';','!','?', {type:'backspace', label:'⌫'}],
      [{type:'switch-abc', label:'abc'}, {type:'comma', label:','}, {type:'space', label:'English'}, {type:'period', label:'.'}, {type:'enter', label:'↵'}]
    ],
    android_sym: [
      ['~','`','|','•','√','π','÷','×','{','}'],
      ['£','¢','€','¥','^','°','=','[',']','\\'],
      [{type:'switch-num', label:'?123'}, '%','_','<','>',',','.', {type:'backspace', label:'⌫'}],
      [{type:'switch-abc', label:'abc'}, {type:'comma', label:','}, {type:'space', label:'English'}, {type:'period', label:'.'}, {type:'enter', label:'↵'}]
    ]
  };

  const handleKeyPress = (keyData: KeyItem) => {
    if (!isPremium) {
      if (onPremiumTrigger) onPremiumTrigger();
      return;
    }
    
    if (typeof keyData === 'string') {
      sendInputToFrame({ char: keyData });
      if (shiftActive && keyboardPage === 'ABC') {
        setShiftActive(false);
        setKeyboardPage('abc');
      }
    } else {
      const type = keyData.type;
      if (type === 'space') {
        sendInputToFrame({ char: ' ' });
      } else if (type === 'enter') {
        sendInputToFrame({ action: 'enter' });
      } else if (type === 'backspace') {
        sendInputToFrame({ action: 'backspace' });
      } else if (type === 'comma') {
        sendInputToFrame({ char: ',' });
      } else if (type === 'period') {
        sendInputToFrame({ char: '.' });
      } else if (type === 'shift' || type === 'shift-active') {
        const nextShift = !shiftActive;
        setShiftActive(nextShift);
        setKeyboardPage(nextShift ? 'ABC' : 'abc');
      } else if (type === 'switch-123') {
        setKeyboardPage('num');
      } else if (type === 'switch-abc') {
        setKeyboardPage(shiftActive ? 'ABC' : 'abc');
      } else if (type === 'switch-symbols') {
        setKeyboardPage('sym');
      } else if (type === 'switch-num') {
        setKeyboardPage('num');
      }
    }
  };

  const renderAndroidKeyContent = (keyChar: string) => {
    const secondaryMap: Record<string, string> = {
      q: '1', w: '2', e: '3', r: '4', t: '5', y: '6', u: '7', i: '8', o: '9', p: '0',
      a: '@', s: '#', d: '$', f: '_', g: '&', h: '-', j: '+', k: '(', l: ')'
    };
    const secondary = secondaryMap[keyChar.toLowerCase()];
    
    return (
      <div className="gboard-key-content">
        {secondary && <span className="gboard-key-secondary">{secondary}</span>}
        <span className="gboard-key-primary">{keyChar}</span>
      </div>
    );
  };

  const layoutKey = `${osMode}_${keyboardPage}`;
  const layout = KEYBOARD_LAYOUTS[layoutKey] || [];

  // --- Premium-only Emoji page check ---
  if (keyboardPage === 'emoji') {
    if (!isPremium) {
      setKeyboardPage('abc');
      if (onPremiumTrigger) onPremiumTrigger();
      return null;
    }

    return (
      <div 
        id="virtual-keyboard" 
        className={`${keyboardOpen ? '' : 'keyboard-hidden'} theme-${keyboardTheme}`}
        onPointerDown={(e) => e.preventDefault()}
      >
        <div className="keyboard-header">
          <span className="keyboard-hint">Emojis</span>
          <div className="keyboard-theme-selector">
            <button className={`theme-btn ${keyboardTheme === 'light' ? 'active' : ''}`} onPointerDown={() => setKeyboardTheme('light')} title="Light Theme">☀️</button>
            <button className={`theme-btn ${keyboardTheme === 'dark' ? 'active' : ''}`} onPointerDown={() => setKeyboardTheme('dark')} title="Dark Theme">🌙</button>
            <button className={`theme-btn ${keyboardTheme === 'night' ? 'active' : ''}`} onPointerDown={() => setKeyboardTheme('night')} title="Night Theme">🌃</button>
          </div>
          <button id="btn-close-keyboard" onClick={onClose} title="Close Keyboard">&#10005;</button>
        </div>
        
        <div className="emoji-grid-container">
          {EMOJIS.map((emoji, idx) => (
            <button 
              key={idx} 
              className="emoji-btn"
              onPointerDown={() => sendInputToFrame({ char: emoji })}
            >
              {emoji}
            </button>
          ))}
        </div>
        
        <div className="emoji-bottom-bar">
          <button className="key special-key action-key switch-abc-btn" onPointerDown={() => setKeyboardPage(shiftActive ? 'ABC' : 'abc')}>
            ABC
          </button>
          <button className="key space-key" onPointerDown={() => sendInputToFrame({ char: ' ' })}>
            space
          </button>
          <button className="key special-key action-key backspace-btn" onPointerDown={() => sendInputToFrame({ action: 'backspace' })}>
            ⌫
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      id="virtual-keyboard" 
      className={`${keyboardOpen ? '' : 'keyboard-hidden'} theme-${keyboardTheme} ${!isPremium ? 'free-keyboard-empty-layout' : ''}`}
      onPointerDown={(e) => e.preventDefault()}
      style={{
        height: !isPremium ? '230px' : undefined // Set clean shorter empty layout height
      }}
    >
      <div className="keyboard-header">
        <span className="keyboard-hint">
          {osMode === 'ios' ? 'iOS Keyboard Layout' : 'Android Gboard Layout'} {!isPremium && '(Locked preview)'}
        </span>
        
        {isPremium && (
          <div className="keyboard-theme-selector">
            <button className={`theme-btn ${keyboardTheme === 'light' ? 'active' : ''}`} onPointerDown={() => setKeyboardTheme('light')} title="Light Theme">☀️</button>
            <button className={`theme-btn ${keyboardTheme === 'dark' ? 'active' : ''}`} onPointerDown={() => setKeyboardTheme('dark')} title="Dark Theme">🌙</button>
            <button className={`theme-btn ${keyboardTheme === 'night' ? 'active' : ''}`} onPointerDown={() => setKeyboardTheme('night')} title="Night Theme">🌃</button>
          </div>
        )}
        
        <button id="btn-close-keyboard" onClick={onClose} title="Close Keyboard">&#10005;</button>
      </div>

      {isPremium ? (
        <>
          {/* Prediction Suggestion Bar */}
          <div className="keyboard-prediction-bar">
            <button className="prediction-item" onPointerDown={() => sendInputToFrame({ char: 'i ' })}>i</button>
            <button className="prediction-item" onPointerDown={() => sendInputToFrame({ char: 'the ' })}>the</button>
            <button className="prediction-item" onPointerDown={() => sendInputToFrame({ char: "i'm " })}>i'm</button>
          </div>

          <div id="keyboard-keys-container" className="keyboard-keys">
            {layout.map((row, rIdx) => (
              <div className="key-row" key={rIdx}>
                {row.map((keyItem, kIdx) => {
                  if (typeof keyItem === 'string') {
                    return (
                      <button
                        key={kIdx}
                        className="key"
                        data-char={keyItem}
                        onPointerDown={() => handleKeyPress(keyItem)}
                      >
                        {osMode === 'android' && keyboardPage === 'abc' 
                          ? renderAndroidKeyContent(keyItem) 
                          : keyItem
                        }
                      </button>
                    );
                  } else {
                    let extraClass = `special-key ${keyItem.type}-key`;
                    let displayLabel = keyItem.label;

                    if (keyItem.type === 'space') {
                      extraClass += ' space-key';
                      if (osMode === 'android') {
                        displayLabel = 'English';
                      } else {
                        displayLabel = 'space';
                      }
                    } else if (keyItem.type === 'enter') {
                      extraClass += ' action-key';
                      if (osMode === 'ios') {
                        displayLabel = 'return';
                      } else {
                        displayLabel = '↵';
                        extraClass += ' gboard-enter';
                      }
                    } else if (keyItem.type === 'backspace') {
                      extraClass += ' action-key';
                    } else if (keyItem.type === 'shift' || keyItem.type === 'shift-active') {
                      extraClass += ' action-key';
                      if (shiftActive) extraClass += ' active-shift';
                    }

                    return (
                      <button
                        key={kIdx}
                        className={`key ${extraClass}`}
                        onPointerDown={() => handleKeyPress(keyItem)}
                      >
                        {displayLabel}
                      </button>
                    );
                  }
                })}
              </div>
            ))}
          </div>

          {osMode === 'ios' && (
            <div className="ios-keyboard-bottom-accessories">
              <button 
                className="accessory-btn emoji-trigger" 
                onPointerDown={() => setKeyboardPage('emoji')}
                title="Smiley Emojis"
              >
                😀
              </button>
              <div className="ios-bottom-space-placeholder"></div>
              <button 
                className="accessory-btn mic-trigger"
                onPointerDown={() => sendInputToFrame({ char: '🎤' })}
                title="Dictation Microphone"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
              </button>
            </div>
          )}
        </>
      ) : (
        /* Empty Layout preview for free users: Absolutely blank inside, showing only layout */
        <div 
          className="empty-layout-preview" 
          onClick={onPremiumTrigger}
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '24px',
            gap: '12px'
          }}
        >
          <div style={{ fontSize: '24px', opacity: 0.55 }}>🔒</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', opacity: 0.8 }}>
            Simulating Keyboard Layout footprint
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', opacity: 0.6, maxWidth: '240px' }}>
            Alphanumeric keys and typing features are locked. Click anywhere here to unlock.
          </div>
        </div>
      )}
    </div>
  );
};

export default VirtualKeyboard;
