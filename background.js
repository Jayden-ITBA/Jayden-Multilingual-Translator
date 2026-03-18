// background.js - Consolidated & Flattened
const AITranslationService = {
  apiKey: null,
  setApiKey: (key) => { AITranslationService.apiKey = key; },
  translate: async (text, targetLang) => {
    // If no key in memory, try to get it from storage right now
    if (!AITranslationService.apiKey) {
      const storage = await chrome.storage.sync.get(['apiKey']);
      if (storage.apiKey) AITranslationService.apiKey = storage.apiKey;
    }

    if (!AITranslationService.apiKey) {
      console.warn("Translation skipped: API Key missing.");
      return "Error: Please set API Key in Popup";
    }

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
            { role: "system", content: `You are a real-time subtitle translator. Translate to ${targetLang}. Concise, natural subtitles ONLY. If original is English, translate to Vietnamese.` },
            { role: "user", content: text }
          ],
          temperature: 0.3
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return data.choices[0].message.content.trim();
    } catch (e) { 
      console.error("Translation API Error:", e);
      return `[Trans Error]: ${e.message}`; 
    }
  }
};

let targetLanguage = 'vi';

// Initial Load
chrome.storage.sync.get(['apiKey', 'targetLanguage'], (result) => {
  if (result.apiKey) AITranslationService.setApiKey(result.apiKey);
  if (result.targetLanguage) targetLanguage = result.targetLanguage;
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_CAPTURE") {
    chrome.storage.sync.set({ isCapturing: true });
    broadcastToAllTabs("START_HYBRID_ENGINE");
  } else if (request.action === "STOP_CAPTURE") {
    chrome.storage.sync.set({ isCapturing: false });
    broadcastToAllTabs("STOP_HYBRID_ENGINE");
  } else if (request.action === "SET_LANGUAGE") {
    targetLanguage = request.language;
    chrome.storage.sync.set({ targetLanguage: request.language });
  } else if (request.action === "SET_API_KEY") {
    AITranslationService.setApiKey(request.apiKey);
    chrome.storage.sync.set({ apiKey: request.apiKey });
  } else if (request.action === "PROCESS_TEXT") {
    handleTextProcessing(request.text, sender.tab.id);
  }
});

async function handleTextProcessing(text, tabId) {
  chrome.storage.sync.get(['isCapturing'], async (res) => {
    if (!res.isCapturing) return;
    const translatedText = await AITranslationService.translate(text, targetLanguage);
    chrome.tabs.sendMessage(tabId, {
      action: "UPDATE_SUBTITLES",
      original: text,
      translated: translatedText
    }).catch(() => {});
  });
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
