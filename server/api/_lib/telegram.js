// Обёртка над Telegram Bot API. Использует существующего бота (TELEGRAM_BOT_TOKEN).

export function botToken() {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

export function botUsername() {
  return process.env.TELEGRAM_BOT_USERNAME || "";
}

export function hasBot() {
  return Boolean(botToken());
}

/** Вызов метода Bot API. Бросает, если токен не задан. */
export async function tg(method, payload) {
  const token = botToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан");
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

/** Отправить код входа + инлайн-кнопку «Подтвердить вход» (способ 'confirm'). */
export async function sendLoginCode(chatId, code, token) {
  return tg("sendMessage", {
    chat_id: chatId,
    text: `🔐 Код для входа на yelyginn.ru: ${code}\n\nИли подтвердите вход кнопкой ниже. Код действует 5 минут.`,
    reply_markup: {
      inline_keyboard: [[{ text: "✅ Подтвердить вход", callback_data: `confirm_${token}` }]],
    },
  });
}

/** Запросить номер телефона кнопкой (request_contact). */
export async function askContact(chatId) {
  return tg("sendMessage", {
    chat_id: chatId,
    text: "Чтобы войти на yelyginn.ru, поделитесь номером телефона — это привяжет ваш аккаунт к боту (нужно один раз).",
    reply_markup: {
      keyboard: [[{ text: "📱 Поделиться номером", request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
}
