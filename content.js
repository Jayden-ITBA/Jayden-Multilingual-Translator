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

  function initWebSpeech(onResult) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) onResult(finalTranscript);
    };
  }

  function initOverlay() {
    if (document.getElementById('jayden-translator-overlay')) return;
    const container = document.createElement('div');
    container.id = 'jayden-translator-overlay';
    const shadow = container.attachShadow({ mode: 'open' });
    
    const style = document.createElement('style');
    style.textContent = `
      #subtitle-box {
        position: fixed; bottom: 12%; left: 50%; transform: translateX(-50%);
        background: rgba(18, 18, 18, 0.95); backdrop-filter: blur(10px);
        color: white; padding: 10px 20px; border-radius: 12px;
        font-family: system-ui, -apple-system, sans-serif; text-align: center;
        z-index: 10000; min-width: 400px; max-width: 85%;
        border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
        user-select: none;
      }
      #drag-handle {
        width: 100%; height: 12px; cursor: move;
        background: rgba(255,255,255,0.05); border-radius: 6px; margin-bottom: 8px;
        display: flex; justify-content: center; align-items: center;
      }
      #drag-handle::after { content: "•••"; color: #555; font-size: 10px; letter-spacing: 2px; }
      .original { font-size: 14px; color: #b0b0b0; margin-bottom: 4px; font-style: italic; opacity: 0.8; }
      .translated { font-size: 21px; font-weight: 700; color: #ffffff; line-height: 1.3; }
    `;
    
    const box = document.createElement('div');
    box.id = 'subtitle-box';
    box.innerHTML = `
      <div id="drag-handle"></div>
      <div id="jayden-original" class="original">Waiting for speech...</div>
      <div id="jayden-translated" class="translated">Đang chờ âm thanh...</div>
    `;
    
    shadow.appendChild(style);
    shadow.appendChild(box);
    document.body.appendChild(container);
    makeDraggable(box, shadow.getElementById('drag-handle'));
  }

  function updateUI(original, translated) {
    const overlay = document.getElementById('jayden-translator-overlay');
    if (!overlay || !overlay.shadowRoot) return;
    const origEl = overlay.shadowRoot.getElementById('jayden-original');
    const transEl = overlay.shadowRoot.getElementById('jayden-translated');
    if (origEl) origEl.innerText = original;
    if (transEl) transEl.innerText = translated;
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
    activeObserver = setInterval(() => {
      const text = CCExtractor.detectCC();
      if (text) chrome.runtime.sendMessage({ action: "PROCESS_TEXT", text });
    }, 1000);
    setTimeout(() => {
      if (!CCExtractor.detectCC() && !isNativeRunning) {
        initWebSpeech((text) => chrome.runtime.sendMessage({ action: "PROCESS_TEXT", text }));
        if (recognition) { recognition.start(); isNativeRunning = true; }
      }
    }, 3000);
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
