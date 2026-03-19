// popup.js - Updated for Premium UI
document.addEventListener('DOMContentLoaded', () => {
  const mainToggle = document.getElementById('main-toggle');
  const stopBtn = document.getElementById('stop-btn');
  const headerStatus = document.getElementById('header-status');
  const activeSection = document.getElementById('active-translation-section');
  const langSelect = document.getElementById('lang-select');
  const currentLangText = document.getElementById('current-lang-text');
  const apiKeyInput = document.getElementById('api-key-input');
  const providerSelect = document.getElementById('provider-select');
  const gearLink = document.getElementById('gear-link');

  // Load saved state
  chrome.storage.sync.get(['targetLanguage', 'apiKey', 'isCapturing', 'provider'], (result) => {
    if (result.targetLanguage) {
      langSelect.value = result.targetLanguage;
      updateLangText(result.targetLanguage);
    }
    
    if (result.apiKey) apiKeyInput.value = result.apiKey;
    if (result.provider) {
      providerSelect.value = result.provider;
      updateKeyPlaceholder(result.provider);
    }
    
    if (result.isCapturing) {
      updateUIActive(true);
      mainToggle.checked = true;
    }
  });

  function updateKeyPlaceholder(provider) {
    const names = {
      'openai': 'OpenAI', 'gemini': 'Google Gemini',
      'deepseek': 'DeepSeek', 'openrouter': 'OpenRouter'
    };
    apiKeyInput.placeholder = `Enter ${names[provider]} Key`;
  }

  function updateUIActive(isActive) {
    if (isActive) {
      headerStatus.innerText = "Active";
      headerStatus.classList.add('status-active');
      activeSection.style.display = 'block';
    } else {
      headerStatus.innerText = "Inactive";
      headerStatus.classList.remove('status-active');
      activeSection.style.display = 'none';
      mainToggle.checked = false;
    }
  }

  function updateLangText(code) {
    const names = {
      'vi': 'VIETNAMESE',
      'en': 'ENGLISH',
      'ja': 'JAPANESE',
      'ko': 'KOREAN',
      'zh': 'CHINESE',
      'fr': 'FRENCH'
    };
    currentLangText.innerText = names[code] || 'VIETNAMESE';
  }

  mainToggle.addEventListener('change', () => {
    if (mainToggle.checked) {
      updateUIActive(true);
      chrome.runtime.sendMessage({ action: "START_CAPTURE" });
    } else {
      updateUIActive(false);
      chrome.runtime.sendMessage({ action: "STOP_CAPTURE" });
    }
  });

  stopBtn.addEventListener('click', () => {
    updateUIActive(false);
    chrome.runtime.sendMessage({ action: "STOP_CAPTURE" });
  });

  langSelect.addEventListener('change', () => {
    updateLangText(langSelect.value);
    chrome.runtime.sendMessage({ action: "SET_LANGUAGE", language: langSelect.value });
  });

  apiKeyInput.addEventListener('input', () => {
    const val = apiKeyInput.value.trim();
    chrome.runtime.sendMessage({ action: "SET_API_KEY", apiKey: val });
  });

  providerSelect.addEventListener('change', () => {
    const provider = providerSelect.value;
    updateKeyPlaceholder(provider);
    chrome.runtime.sendMessage({ action: "SET_PROVIDER", provider: provider });
  });

  gearLink.addEventListener('click', () => {
    chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
  });
});
