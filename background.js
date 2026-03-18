// background.js - Version 1.0.8 (Finalized Platform Support)
const AITranslationService = {
  apiKey: null,
  provider: 'openai',
  setApiKey: (key) => { AITranslationService.apiKey = key; },
  setProvider: (prov) => { AITranslationService.provider = prov; },
  
  // Whisper Transcription (OpenAI only for now)
  transcribe: async (audioBlob) => {
    if (!AITranslationService.apiKey || AITranslationService.provider !== 'openai') return null;
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");

    try {
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${AITranslationService.apiKey}` },
        body: formData
      });
      const data = await response.json();
      return data.text;
    } catch (e) { return null; }
  },

  // GPT / Multi-LLM Translation
  translate: async (text, targetLang) => {
    if (!AITranslationService.apiKey || !text) return text;
    
    let url = "https://api.openai.com/v1/chat/completions";
    let model = "gpt-4o-mini";
    let headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AITranslationService.apiKey}`
    };

    if (AITranslationService.provider === 'openrouter') {
      url = "https://openrouter.ai/api/v1/chat/completions";
      model = "openai/gpt-4o-mini"; 
      headers['HTTP-Referer'] = 'chrome-extension://jayden-translator';
    } else if (AITranslationService.provider === 'deepseek') {
      url = "https://api.deepseek.com/chat/completions";
      model = "deepseek-chat";
    } else if (AITranslationService.provider === 'gemini') {
      url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${AITranslationService.apiKey}`;
      const prompt = `Translate to ${targetLang}. Concise subtitles. Original: ${text}`;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });
        const data = await response.json();
        return data.candidates[0].content.parts[0].text.trim();
      } catch (e) { return text; }
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: `Translate to ${targetLang}. Concise subtitles.` },
            { role: "user", content: text }
          ]
        })
      });
      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (e) { return text; }
  }
};

let isCapturing = false;
let targetLanguage = 'vi';
let audioRecorder = null;
let streamInstance = null;

chrome.storage.sync.get(['apiKey', 'targetLanguage', 'provider'], (result) => {
  if (result.apiKey) AITranslationService.setApiKey(result.apiKey);
  if (result.targetLanguage) targetLanguage = result.targetLanguage;
  if (result.provider) AITranslationService.setProvider(result.provider);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_CAPTURE") {
    startTabAudioCapture();
  } else if (request.action === "STOP_CAPTURE") {
    stopTabAudioCapture();
  } else if (request.action === "SET_API_KEY") {
    AITranslationService.setApiKey(request.apiKey);
    chrome.storage.sync.set({ apiKey: request.apiKey });
  } else if (request.action === "SET_PROVIDER") {
    AITranslationService.setProvider(request.provider);
    chrome.storage.sync.set({ provider: request.provider });
  } else if (request.action === "SET_LANGUAGE") {
    targetLanguage = request.language;
    chrome.storage.sync.set({ targetLanguage: request.language });
  } else if (request.action === "PROCESS_TEXT") {
    handleTranslationFlow(request.text, sender.tab.id);
  }
});

function startTabAudioCapture() {
  chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
    if (!stream) return;
    const audio = new Audio();
    audio.srcObject = stream;
    audio.play();
    streamInstance = stream;
    isCapturing = true;
    chrome.storage.sync.set({ isCapturing: true });
    broadcastToAllTabs("START_HYBRID_ENGINE");
    startRecordingChunks(stream);
  });
}

function startRecordingChunks(stream) {
  audioRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
  audioRecorder.ondataavailable = async (event) => {
    if (event.data.size > 0 && isCapturing) {
      const transcription = await AITranslationService.transcribe(event.data);
      if (transcription) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) handleTranslationFlow(transcription, tabs[0].id);
        });
      }
    }
  };
  audioRecorder.start(3000); 
}

function stopTabAudioCapture() {
  isCapturing = false;
  if (audioRecorder && audioRecorder.state !== "inactive") audioRecorder.stop();
  if (streamInstance) streamInstance.getTracks().forEach(t => t.stop());
  chrome.storage.sync.set({ isCapturing: false });
  broadcastToAllTabs("STOP_HYBRID_ENGINE");
}

async function handleTranslationFlow(text, tabId) {
  const translation = await AITranslationService.translate(text, targetLanguage);
  chrome.tabs.sendMessage(tabId, { action: "UPDATE_SUBTITLES", original: text, translated: translation }).catch(() => {});
}

function broadcastToAllTabs(action) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { action }).catch(() => {}));
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.storage.sync.get(['isCapturing'], (res) => {
      if (res.isCapturing) chrome.tabs.sendMessage(tabId, { action: "START_HYBRID_ENGINE" }).catch(() => {});
    });
  }
});
