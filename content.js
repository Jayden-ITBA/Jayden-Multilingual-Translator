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
    if (document.getElementById('jayden-translator-overlay')) return;
    
    // Safety check for document body
    if (!document.body) {
      setTimeout(initOverlay, 500);
      return;
    }

    const container = document.createElement('div');
    container.id = 'jayden-translator-overlay';
    const shadow = container.attachShadow({ mode: 'open' });
    
    const style = document.createElement('style');
    style.textContent = `
      #subtitle-box {
        position: fixed; bottom: 12%; left: 50%; transform: translateX(-50%);
        background: rgba(18, 18, 18, 0.95); backdrop-filter: blur(12px);
        color: white; padding: 14px 28px; border-radius: 16px;
        font-family: 'Inter', system-ui, -apple-system, sans-serif; text-align: center;
        z-index: 2147483647; min-width: 420px; max-width: 90%;
        border: 1px solid rgba(255, 255, 255, 0.2); 
        box-shadow: 0 15px 50px rgba(0, 0, 0, 0.8);
        user-select: none; transition: opacity 0.3s ease;
        resize: both; overflow: hidden;
      }
      #drag-handle {
        width: 100%; height: 16px; cursor: move;
        background: rgba(255,255,255,0.06); border-radius: 8px; margin-bottom: 12px;
        display: flex; justify-content: center; align-items: center;
      }
      #drag-handle::after { content: "•••"; color: rgba(255,255,255,0.3); font-size: 14px; letter-spacing: 4px; }
      #resize-corner {
        position: absolute; right: 0; bottom: 0; width: 18px; height: 18px;
        cursor: nwse-resize; background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.3) 50%);
        border-bottom-right-radius: 16px;
      }
      .original { font-size: 15px; color: #b0b0b0; margin-bottom: 8px; font-style: italic; opacity: 0.9; line-height: 1.2; }
      .translated { font-size: 24px; font-weight: 700; color: #ffffff; line-height: 1.4; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
    `;
    
    const box = document.createElement('div');
    box.id = 'subtitle-box';
    box.innerHTML = `
      <div id="drag-handle"></div>
      <div id="jayden-original" class="original">Đang chờ âm thanh...</div>
      <div id="jayden-translated" class="translated">Jayden Translator Active</div>
      <div id="resize-corner"></div>
    `;
    
    shadow.appendChild(style);
    shadow.appendChild(box);
    document.body.appendChild(container);
    makeDraggable(box, shadow.getElementById('drag-handle'));
  }

  function updateUI(original, translated) {
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
    if (isExtensionActive) return;
    isExtensionActive = true;
    initOverlay();
    
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
