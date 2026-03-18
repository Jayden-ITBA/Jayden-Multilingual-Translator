/**
 * CC Extractor Service
 * Logic to detect and extract Closed Captions from various web players.
 */

export const CCExtractor = {
  detectCC: () => {
    // Check for YouTube-style CC
    const ytCC = document.querySelector('.ytp-caption-segment');
    if (ytCC) return ytCC.innerText;

    // Check for generic video with track elements
    const video = document.querySelector('video');
    if (video && video.textTracks && video.textTracks.length > 0) {
      // Logic to listen to active cues
      return "Capturing via TextTracks..."; 
    }

    return null;
  },

  startListening: (callback) => {
    const observer = new MutationObserver(() => {
      const text = CCExtractor.detectCC();
      if (text) callback(text);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return observer;
  }
};
