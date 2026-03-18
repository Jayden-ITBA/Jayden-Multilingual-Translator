// background.js - Version 1.0.5 (Internal Audio + Whisper STT)
const AITranslationService = {
  apiKey: null,
  setApiKey: (key) => { AITranslationService.apiKey = key; },
  
  // Whisper Transcription
  transcribe: async (audioBlob) => {
    if (!AITranslationService.apiKey) return null;
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
    } catch (e) {
      console.error("Whisper Error:", e);
      return null;
    }
  },

  // GPT Translation
  translate: async (text, targetLang) => {
    if (!AITranslationService.apiKey || !text) return text;
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AITranslationService.apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: `You are a real-time subtitle translator. Translate to ${targetLang}. Concise, natural subtitles.` },
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

chrome.storage.sync.get(['apiKey', 'targetLanguage', 'isCapturing'], (result) => {
  if (result.apiKey) AITranslationService.setApiKey(result.apiKey);
  if (result.targetLanguage) targetLanguage = result.targetLanguage;
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_CAPTURE") {
    startTabAudioCapture();
  } else if (request.action === "STOP_CAPTURE") {
    stopTabAudioCapture();
  } else if (request.action === "SET_API_KEY") {
    AITranslationService.setApiKey(request.apiKey);
    chrome.storage.sync.set({ apiKey: request.apiKey });
  } else if (request.action === "SET_LANGUAGE") {
    targetLanguage = request.language;
    chrome.storage.sync.set({ targetLanguage: request.language });
  } else if (request.action === "PROCESS_TEXT") {
    handleTranslationFlow(request.text, sender.tab.id);
  }
});

function startTabAudioCapture() {
  chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
    if (!stream) {
      console.error("Tab capture failed:", chrome.runtime.lastError);
      return;
    }
    
    // Play the audio locally so the user can still hear it
    const audio = new Audio();
    audio.srcObject = stream;
    audio.play();

    streamInstance = stream;
    isCapturing = true;
    chrome.storage.sync.set({ isCapturing: true });
    broadcastToAllTabs("START_HYBRID_ENGINE");

    // Start recording chunks for Whisper
    startRecordingChunks(stream);
  });
}

function startRecordingChunks(stream) {
  const options = { mimeType: 'audio/webm;codecs=opus' };
  audioRecorder = new MediaRecorder(stream, options);
  
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

  // Record in 3-second intervals for real-time-ish feed
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
  chrome.tabs.sendMessage(tabId, {
    action: "UPDATE_SUBTITLES",
    original: text,
    translated: translation
  }).catch(() => {});
}

function broadcastToAllTabs(action) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { action }).catch(() => {});
    });
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.storage.sync.get(['isCapturing'], (res) => {
      if (res.isCapturing) {
        chrome.tabs.sendMessage(tabId, { action: "START_HYBRID_ENGINE" }).catch(() => {});
      }
    });
  }
});
