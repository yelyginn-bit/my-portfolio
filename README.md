<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/57070eb7-8d1f-4fcc-9752-85e3a715c2c1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`

2. Create `.env.local` file and set your variables:
   ```
   GEMINI_API_KEY="your_gemini_api_key"
   TELEGRAM_BOT_TOKEN="your_bot_token"
   TELEGRAM_CHAT_ID="your_chat_id"
   ```

3. Run the app:
   `npm run dev`

## Deploy to Netlify

1. Push to GitHub/GitLab/Bitbucket
2. Connect your repo to Netlify
3. Set environment variables in Netlify dashboard:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
4. Deploy! The `netlify.toml` will handle everything

## Features

- ✅ Telegram notifications for form submissions
- ✅ Netlify Functions for serverless form handling
- ✅ Full type safety with TypeScript
- ✅ Responsive design with Motion animations
