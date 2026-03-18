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
      const ytCC = document.querySelector('.ytp-caption-segment');
      if (ytCC) return ytCC.innerText;
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
    
    // Inject Styles directly to avoid link issues
    const style = document.createElement('style');
    style.textContent = `
      #subtitle-box {
        position: fixed; bottom: 12%; left: 50%; transform: translateX(-50%);
        background: rgba(18, 18, 18, 0.9); backdrop-filter: blur(8px);
        color: white; padding: 16px 28px; border-radius: 16px;
        font-family: system-ui, -apple-system, sans-serif; text-align: center;
        z-index: 10000; cursor: move; min-width: 380px; max-width: 80%;
        border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      }
      .original { font-size: 15px; color: #b0b0b0; margin-bottom: 8px; font-style: italic; opacity: 0.9; }
      .translated { font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.3; }
    `;
    
    const box = document.createElement('div');
    box.id = 'subtitle-box';
    box.innerHTML = `
      <div id="jayden-original" class="original">Waiting for speech...</div>
      <div id="jayden-translated" class="translated">Đang chờ âm thanh...</div>
    `;
    
    shadow.appendChild(style);
    shadow.appendChild(box);
    document.body.appendChild(container);
    makeDraggable(box);
  }

  function updateUI(original, translated) {
    const overlay = document.getElementById('jayden-translator-overlay');
    if (!overlay || !overlay.shadowRoot) return;
    const origEl = overlay.shadowRoot.getElementById('jayden-original');
    const transEl = overlay.shadowRoot.getElementById('jayden-translated');
    if (origEl) origEl.innerText = original;
    if (transEl) transEl.innerText = translated;
  }

  function makeDraggable(el) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    el.onmousedown = (e) => {
      if (e.target.tagName === 'SELECT') return;
      e.preventDefault();
      pos3 = e.clientX; pos4 = e.clientY;
      document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
      document.onmousemove = (e) => {
        e.preventDefault();
        pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
        pos3 = e.clientX; pos4 = e.clientY;
        el.style.top = (el.offsetTop - pos2) + "px";
        el.style.left = (el.offsetLeft - pos1) + "px";
        el.style.transform = 'none';
      };
    };
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
