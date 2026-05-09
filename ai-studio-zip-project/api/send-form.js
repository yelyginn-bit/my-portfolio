/**
 * Vercel Serverless Function for sending form submissions to Telegram
 * Only sends to Telegram - no email duplicates
 */

const escapeHtml = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const trimTo = (value = '', limit = 1500) => {
  return String(value).trim().slice(0, limit);
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error('❌ Missing Telegram credentials');
      return res.status(500).json({
        error: 'Server misconfigured: Missing Telegram credentials',
        ok: false
      });
    }

    const { name, contact, message } = req.body;

    // Validate inputs
    if (!name || !contact || !message) {
      return res.status(400).json({
        error: 'Missing required fields: name, contact, message',
        ok: false
      });
    }

    const trimmedName = trimTo(name, 160);
    const trimmedContact = trimTo(contact, 200);
    const trimmedMessage = trimTo(message, 1500);

    // Format timestamp
    const now = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date());

    // Build Telegram message with HTML formatting
    const telegramText = [
      '<b>🎬 Новая заявка с сайта yelyginn.ru</b>',
      '',
      `<b>👤 Имя:</b> <i>${escapeHtml(trimmedName)}</i>`,
      `<b>📞 Контакт:</b> <code>${escapeHtml(trimmedContact)}</code>`,
      `<b>📝 Задача:</b>`,
      `<i>${escapeHtml(trimmedMessage)}</i>`,
      '',
      `<b>🕐 Время:</b> ${escapeHtml(now)} (МСК)`,
    ].join('\n');

    console.log('📤 Sending to Telegram...', {
      botToken: botToken.slice(0, 10) + '***',
      chatId,
      messageLength: telegramText.length
    });

    // Send to Telegram
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: telegramText,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      }
    );

    const telegramData = await telegramResponse.json();

    if (!telegramResponse.ok || !telegramData.ok) {
      const errorMsg = telegramData.description || 'Unknown Telegram error';
      console.error('❌ Telegram error:', errorMsg);
      return res.status(502).json({
        error: `Telegram API error: ${errorMsg}`,
        ok: false
      });
    }

    console.log('✅ Message sent to Telegram successfully', {
      messageId: telegramData.result?.message_id
    });

    return res.status(200).json({
      ok: true,
      message: 'Form submitted successfully',
      telegramMessageId: telegramData.result?.message_id
    });

  } catch (error) {
    console.error('❌ Error processing form:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
      ok: false
    });
  }
}
