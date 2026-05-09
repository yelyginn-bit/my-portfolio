const json = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    ...init,
  });

const escapeHtml = (value = '') =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const trimTo = (value = '', limit = 1200) => value.trim().slice(0, limit);

export default async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, { status: 405 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return json(
      { error: 'На сервере не настроены TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID.' },
      { status: 500 }
    );
  }

  try {
    const payload = await request.json();
    const name = trimTo(String(payload?.name || ''), 160);
    const contact = trimTo(String(payload?.contact || ''), 200);
    const brief = trimTo(String(payload?.brief || ''), 1500);
    const source = trimTo(String(payload?.source || ''), 500);
    const honeypot = trimTo(String(payload?.website || ''), 200);

    if (honeypot) {
      return json({ ok: true });
    }

    if (!name || !contact || !brief) {
      return json(
        { error: 'Нужны имя, контакт и краткое описание проекта.' },
        { status: 400 }
      );
    }

    const now = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date());

    const text = [
      '<b>Новая заявка с сайта</b>',
      '',
      `<b>Имя:</b> ${escapeHtml(name)}`,
      `<b>Контакт:</b> ${escapeHtml(contact)}`,
      `<b>Задача:</b> ${escapeHtml(brief)}`,
      `<b>Время (МСК):</b> ${escapeHtml(now)}`,
      source ? `<b>Источник:</b> ${escapeHtml(source)}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const telegramResult = await telegramResponse.json().catch(() => ({}));

    if (!telegramResponse.ok || telegramResult?.ok !== true) {
      const reason =
        typeof telegramResult?.description === 'string'
          ? telegramResult.description
          : 'Telegram API error';

      return json({ error: `Telegram не принял сообщение: ${reason}` }, { status: 502 });
    }

    return json({ ok: true });
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Не удалось обработать запрос.',
      },
      { status: 500 }
    );
  }
};
