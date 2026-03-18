// Popup Script for Jayden Multilingual Translator
document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  const statusText = document.getElementById('status-text');
  const langSelect = document.getElementById('lang-select');
  const apiKeyInput = document.getElementById('api-key-input');
  const providerSelect = document.getElementById('provider-select');

  // Load saved state
  chrome.storage.sync.get(['targetLanguage', 'apiKey', 'isCapturing', 'provider'], (result) => {
    if (result.targetLanguage) langSelect.value = result.targetLanguage;
    if (result.apiKey) apiKeyInput.value = result.apiKey;
    if (result.provider) providerSelect.value = result.provider;
    
    if (result.isCapturing) {
      updateUIActive(true);
    }
  });

  function updateUIActive(isActive) {
    if (isActive) {
      statusText.innerText = "Active";
      statusText.style.color = "#28a745";
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
    } else {
      statusText.innerText = "Ready";
      statusText.style.color = "#666";
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
    }
  }

  startBtn.addEventListener('click', () => {
    updateUIActive(true);
    chrome.runtime.sendMessage({ action: "START_CAPTURE" });
  });

  stopBtn.addEventListener('click', () => {
    updateUIActive(false);
    chrome.runtime.sendMessage({ action: "STOP_CAPTURE" });
  });

  langSelect.addEventListener('change', () => {
    chrome.runtime.sendMessage({ action: "SET_LANGUAGE", language: langSelect.value });
  });

  apiKeyInput.addEventListener('change', () => {
    chrome.runtime.sendMessage({ action: "SET_API_KEY", apiKey: apiKeyInput.value.trim() });
  });

  providerSelect.addEventListener('change', () => {
    chrome.runtime.sendMessage({ action: "SET_PROVIDER", provider: providerSelect.value });
  });
});
