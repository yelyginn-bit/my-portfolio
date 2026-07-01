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

const submissions = new Map();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 5;

const isValidContact = (value) => {
  const contact = trimTo(value, 200);
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(contact);
  const telegram = /^@[a-zA-Z0-9_]{5,32}$/u.test(contact)
    || /^https?:\/\/t\.me\/[a-zA-Z0-9_]{5,32}\/?$/u.test(contact);
  const phoneDigits = contact.replace(/\D/gu, '');
  return email || telegram || (phoneDigits.length >= 10 && phoneDigits.length <= 15);
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Health check
  if (req.method === 'GET') {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    return res.status(200).json({
      ok: true,
      configured: Boolean(botToken && chatId),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return res.status(500).json({
        error: 'Server misconfigured: Missing Telegram credentials',
        ok: false
      });
    }

    const { name, contact, message, service, website, source } = req.body || {};

    if (!name || !contact || !message) {
      return res.status(400).json({
        error: 'Missing required fields: name, contact, message',
        ok: false
      });
    }
    if (website) {
      return res.status(200).json({ ok: true });
    }

    const trimmedName = trimTo(name, 160);
    const trimmedContact = trimTo(contact, 200);
    const trimmedMessage = trimTo(message, 1500);
    const trimmedService = trimTo(service || 'Не указана', 160);
    const trimmedSource = trimTo(source || 'site', 120);
    if (trimmedName.length < 2 || trimmedMessage.length < 5 || !isValidContact(trimmedContact)) {
      return res.status(400).json({ ok: false, error: 'Проверьте имя, контакт и описание задачи' });
    }

    const ip = trimTo(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown', 120)
      .split(',')[0]
      .trim();
    const nowMs = Date.now();
    const recent = (submissions.get(ip) || []).filter((timestamp) => nowMs - timestamp < RATE_WINDOW_MS);
    if (recent.length >= RATE_LIMIT) {
      return res.status(429).json({ ok: false, error: 'Слишком много заявок. Попробуйте позже.' });
    }
    recent.push(nowMs);
    submissions.set(ip, recent);

    const now = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date());

    const telegramText = [
      '<b>Новая заявка с сайта yelyginn.ru</b>',
      '',
      `<b>Имя:</b> <i>${escapeHtml(trimmedName)}</i>`,
      `<b>Контакт:</b> <code>${escapeHtml(trimmedContact)}</code>`,
      `<b>Услуга:</b> ${escapeHtml(trimmedService)}`,
      `<b>Задача:</b>`,
      `<i>${escapeHtml(trimmedMessage)}</i>`,
      '',
      `<b>Источник:</b> ${escapeHtml(trimmedSource)}`,
      `<b>Время:</b> ${escapeHtml(now)} (МСК)`,
    ].join('\n');

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      return res.status(502).json({
        error: `Telegram API error: ${telegramData.description || 'Unknown error'}`,
        ok: false
      });
    }

    return res.status(200).json({
      ok: true,
      message: 'Form submitted successfully',
      telegramMessageId: telegramData.result?.message_id
    });

  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
      ok: false
    });
  }
}
