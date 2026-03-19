/**
 * Jayden Multilingual Translator - Fully Consolidated Content Script
 * No imports/exports to ensure compatibility across all Chrome tabs.
 */

(function() {
  console.log("Jayden Translator Content Script Initialized");

  let activeObserver = null;
  let isNativeRunning = false;
  let isExtensionActive = false;
  let recognition = null;

  const CCExtractor = {
    detectCC: () => {
      // 1. YouTube specific (multiple possible classes)
      const ytSelectors = [
        '.ytp-caption-segment',
        '.captions-text .caption-visual-line',
        '.ytp-subtitles-player-content'
      ];
      for (const sel of ytSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim()) return el.innerText.trim();
      }

      // 2. Generic Video TextTracks
      const video = document.querySelector('video');
      if (video && video.textTracks) {
        for (let i = 0; i < video.textTracks.length; i++) {
          const track = video.textTracks[i];
          if (track.mode === 'showing' && track.activeCues && track.activeCues.length > 0) {
            return track.activeCues[0].text;
          }
        }
      }
      return null;
    }
  };

  // Web Speech (Mic) removed as per user request for Internal Audio only
  function initWebSpeech() { return null; }

  function initOverlay() {
    try {
      if (document.getElementById('jayden-translator-overlay')) return;
      
      const parent = document.body || document.documentElement;
      if (!parent) {
        setTimeout(initOverlay, 1000);
        return;
      }

      console.log("Jayden Translator: Initializing on", parent.tagName);

      const container = document.createElement('div');
      container.id = 'jayden-translator-overlay';
      const shadow = container.attachShadow({ mode: 'open' });
      
      const style = document.createElement('style');
      style.textContent = `
        #subtitle-box {
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
          background: #000000; border: 2px solid #3d5afe; 
          color: white; padding: 20px 40px; border-radius: 12px;
          font-family: 'Inter', system-ui, -apple-system, sans-serif; text-align: center;
          z-index: 2147483647; min-width: 500px; max-width: 90%;
          box-shadow: 0 0 30px rgba(61, 90, 254, 0.4), 0 20px 60px rgba(0, 0, 0, 1);
          user-select: none; transition: opacity 0.3s ease;
          resize: both; overflow: hidden;
          pointer-events: auto; display: block !important;
        }
        #drag-handle {
          width: 100%; height: 20px; cursor: move;
          background: rgba(255,255,255,0.08); border-radius: 10px; margin-bottom: 12px;
          display: flex; justify-content: center; align-items: center;
        }
        #drag-handle::after { content: "•••"; color: rgba(255,255,255,0.4); font-size: 16px; letter-spacing: 5px; }
        #resize-corner {
          position: absolute; right: 0; bottom: 0; width: 22px; height: 22px;
          cursor: nwse-resize; background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.3) 50%);
          border-bottom-right-radius: 20px;
        }
        .original { font-size: 16px; color: #aaaaaa; margin-bottom: 8px; font-style: italic; opacity: 0.9; line-height: 1.3; }
        .translated { font-size: 26px; font-weight: 800; color: #ffffff; line-height: 1.4; text-shadow: 0 2px 8px rgba(0,0,0,0.6); }
      `;
      
      const box = document.createElement('div');
      box.id = 'subtitle-box';
      box.innerHTML = `
        <div id="drag-handle"></div>
        <div id="jayden-original" class="original">Đang chờ tín hiệu...</div>
        <div id="jayden-translated" class="translated">Jayden Translator Ready</div>
        <div id="resize-corner"></div>
      `;
      
      shadow.appendChild(style);
      shadow.appendChild(box);
      parent.appendChild(container); 
      makeDraggable(box, shadow.getElementById('drag-handle'));

      // Fullscreen support: Move overlay into the fullscreen element (like YouTube player) 
      // otherwise it becomes invisible in fullscreen mode.
      document.addEventListener('fullscreenchange', () => {
        const fsElement = document.fullscreenElement;
        const currentOverlay = document.getElementById('jayden-translator-overlay');
        if (currentOverlay) {
          if (fsElement) {
            fsElement.appendChild(currentOverlay);
          } else {
            document.body.appendChild(currentOverlay);
          }
        }
      });

      console.log("Jayden Translator Overlay Injected Successfully");
    } catch (e) {
      console.error("Jayden Translator Overlay Error:", e);
      setTimeout(initOverlay, 2000);
    }
  }

  function updateUI(original, translated) {
    if (!isExtensionActive) return; // Prevent re-creating UI if stopped
    
    // Self-healing: Ensure overlay exists if a subtitle arrives
    if (!document.getElementById('jayden-translator-overlay')) {
      initOverlay();
    }
    
    const overlay = document.getElementById('jayden-translator-overlay');
    if (!overlay || !overlay.shadowRoot) return;
    
    const origEl = overlay.shadowRoot.getElementById('jayden-original');
    const transEl = overlay.shadowRoot.getElementById('jayden-translated');
    
    if (origEl) origEl.innerText = original;
    if (transEl) {
      // If original and translated are identical, it usually means translation failed
      if (original.trim() === translated.trim()) {
        transEl.innerText = "... (Đang dịch)";
        transEl.style.opacity = "0.6";
      } else {
        transEl.innerText = translated;
        transEl.style.opacity = "1";
      }
    }
  }

  function makeDraggable(el, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      
      const newTop = el.offsetTop - pos2;
      const newLeft = el.offsetLeft - pos1;
      
      el.style.top = newTop + "px";
      el.style.left = newLeft + "px";
      el.style.transform = "none";
      el.style.bottom = "auto";
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  function startEngine() {
    isExtensionActive = true;
    initOverlay();
    
    // Reset position to center if it already existed
    const overlay = document.getElementById('jayden-translator-overlay');
    if (overlay && overlay.shadowRoot) {
      const box = overlay.shadowRoot.getElementById('subtitle-box');
      if (box) {
        box.style.top = "50%";
        box.style.left = "50%";
        box.style.bottom = "auto";
        box.style.transform = "translate(-50%, -50%)";
      }
    }
    
    if (activeObserver) clearInterval(activeObserver);
    let lastProcessedText = "";
    // Polling for CC (Instant source if available)
    activeObserver = setInterval(() => {
      const text = CCExtractor.detectCC();
      if (text && text !== lastProcessedText) {
        lastProcessedText = text;
        chrome.runtime.sendMessage({ action: "PROCESS_TEXT", text });
      }
    }, 800);
  }

  function stopEngine() {
    isExtensionActive = false;
    if (activeObserver) clearInterval(activeObserver);
    if (isNativeRunning && recognition) { recognition.stop(); isNativeRunning = false; }
    const overlay = document.getElementById('jayden-translator-overlay');
    if (overlay) overlay.remove();
  }

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "START_HYBRID_ENGINE") startEngine();
    else if (request.action === "STOP_HYBRID_ENGINE") stopEngine();
    else if (request.action === "UPDATE_SUBTITLES") updateUI(request.original, request.translated);
  });

  chrome.storage.sync.get(['isCapturing'], (res) => {
    if (res.isCapturing) startEngine();
  });
})();
