# Jayden Multilingual Translator Extension

## Introduction
Jayden Multilingual Translator is a Chrome Extension that empowers users to run live subtitles in their desired language to understand video or audio content on the web.

## Installation (For Developers)
1. Clone the repository or download the source code.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the directory containing the extension source code.

## Key Features (Planned)
- **Automatic Detection**: Detects video/audio elements on web pages.
- **Speech-to-Text (ASR) / Native Captions**: Extracts existing subtitles or converts audio to text in real-time.
- **Real-time Translation**: Translates extracted text into the user's preferred language using translation APIs.
- **Customizable UI**: Adjustable subtitle display (font size, colors, position).

## Directory Structure (Draft)
- `manifest.json`: Configuration for the Chrome Extension.
- `background.js`: Handles background tasks and communication with translation APIs.
- `content.js`: Interacts with the web page DOM (capturing audio/video, rendering subtitles).
- `popup/`: UI for the extension icon click.
- `PRD.md`: Product Requirements Document.
