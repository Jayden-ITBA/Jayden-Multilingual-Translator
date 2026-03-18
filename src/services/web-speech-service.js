/**
 * Web Speech API Service
 * Fallback for real-time STT using browser native capabilities.
 */

export const WebSpeechService = {
  recognition: null,

  init: (onResult, onError) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Web Speech API not supported in this browser.");
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US'; // Default, can be dynamic

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      onResult({ final: finalTranscript, interim: interimTranscript });
    };

    recognition.onerror = onError;
    WebSpeechService.recognition = recognition;
    return recognition;
  },

  start: () => {
    if (WebSpeechService.recognition) WebSpeechService.recognition.start();
  },

  stop: () => {
    if (WebSpeechService.recognition) WebSpeechService.recognition.stop();
  }
};
