/**
 * AI Translation Service
 * Uses OpenAI GPT-4o-mini for high-quality, real-time translation.
 */

export const AITranslationService = {
  apiKey: null,

  setApiKey: (key) => {
    AITranslationService.apiKey = key;
  },

  translate: async (text, targetLang) => {
    if (!AITranslationService.apiKey) {
      console.error("API Key missing for Translation.");
      return text; // Return original if no key
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
            {
              role: "system",
              content: `You are a professional subtitle translator. Translate the following text into ${targetLang}. Keep the translation concise and suitable for subtitles. Return ONLY the translated text.`
            },
            {
              role: "user",
              content: text
            }
          ],
          temperature: 0.3
        })
      });

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error("Translation Error:", error);
      return text;
    }
  }
};
