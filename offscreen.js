// offscreen.js
let recorder;
let data = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'start-recording') {
    startRecording(message.streamId);
  } else if (message.type === 'stop-recording') {
    stopRecording();
  }
});

async function startRecording(streamId) {
  if (recorder?.state === 'recording') return;

  const media = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId
      }
    },
    video: false
  });

  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(media);
  source.connect(audioCtx.destination); // Required to keep the stream alive and audible if needed

  recorder = new MediaRecorder(media, { mimeType: 'audio/webm;codecs=opus' });
  recorder.ondataavailable = async (event) => {
    if (event.data.size > 0) {
      const reader = new FileReader();
      reader.readAsDataURL(event.data);
      reader.onloadend = () => {
        chrome.runtime.sendMessage({
          action: 'PROCESS_AUDIO_BLOB',
          dataUrl: reader.result
        });
      };
    }
  };
  recorder.start(2000); // 2-second chunks for purely AI-driven flow
}

function stopRecording() {
  if (recorder && recorder.state !== 'inactive') {
    recorder.stop();
    recorder.stream.getTracks().forEach(t => t.stop());
  }
}
