# Jayden Multilingual Translator Extension

## Introduction
Jayden Multilingual Translator is a Chrome Extension that empowers users to run live subtitles in their desired language to understand video or audio content on the web.

## Installation (For Developers)
1. Clone the repository or download the source code.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the directory containing the extension source code.

## 🔑 Cấu hình API Key (OpenAI)

Để extension hoạt động, bạn cần có một OpenAI API Key. Dưới đây là các bước để tạo:

1.  **Truy cập OpenAI Platform**: Vào [platform.openai.com](https://platform.openai.com/).
2.  **Đăng nhập/Đăng ký**: Sử dụng tài khoản OpenAI của bạn.
3.  **Tạo API Key**: Chọn **Dashboard** -> **API Keys** -> **Create new secret key**.
4.  **Nạp tiền (Billing)**: OpenAI API yêu cầu bạn phải nạp trước một số dư nhỏ (ví dụ $5) để sử dụng tính năng Whisper và GPT.

---

## 🚀 Cách sử dụng

1.  **Cài đặt**: Mở `chrome://extensions/`, bật "Developer mode", chọn **Load unpacked** và trỏ đến thư mục này.
2.  **Cấu hình**: Mở popup, nhập API Key và chọn ngôn ngữ mục tiêu.
3.  **Bắt đầu**: Nhấn **Start Subtitles**. Chrome sẽ hỏi quyền Capture Tab Audio, hãy nhấn **Allow**.
4.  **Trải nghiệm**: Phụ đề nội bộ của tab sẽ được tự động nhận diện và dịch sau mỗi ~3 giây.

---
