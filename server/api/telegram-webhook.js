// POST /api/telegram-webhook — приём апдейтов от Telegram.
// Обрабатывает: /start link_<token> (просит контакт), контакт (привязка + вход),
// callback «✅ Подтвердить вход» (подтверждение по кнопке).
import { getAdmin } from "./_lib/db.js";
import { askContact, tg } from "./_lib/telegram.js";
import { normalizePhone } from "./_lib/util.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  // Проверка секрета вебхука (устанавливается при setWebhook).
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers["x-telegram-bot-api-secret-token"] !== secret) {
    return res.status(401).json({ ok: false });
  }

  const admin = getAdmin();
  const update = req.body || {};

  try {
    // ── /start [link_<token>] ──────────────────────────────────────────────
    if (update.message?.text && update.message.text.startsWith("/start")) {
      const chatId = update.message.chat.id;
      const param = update.message.text.split(" ")[1] || "";
      if (admin && param.startsWith("link_") && param.length <= 220) {
        const token = param.slice(5);
        // Запомним, какой чат начал привязку — пригодится при получении контакта.
        await admin.from("auth_otp").update({ chat_id: chatId }).eq("token", token).eq("status", "pending").gt("expires_at", new Date().toISOString());
      }
      await askContact(chatId);
      return res.status(200).json({ ok: true });
    }

    // ── Получен контакт (номер телефона) ────────────────────────────────────
    if (update.message?.contact) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const contact = msg.contact;
      // Контакт должен принадлежать отправителю (а не пересланный чужой).
      if (contact.user_id && msg.from?.id && contact.user_id !== msg.from.id) {
        await tg("sendMessage", { chat_id: chatId, text: "Пожалуйста, отправьте СВОЙ номер кнопкой ниже." });
        return res.status(200).json({ ok: true });
      }
      const phone = normalizePhone(contact.phone_number);
      if (admin) {
        await admin.from("telegram_links").upsert(
          {
            phone,
            chat_id: chatId,
            tg_user_id: msg.from?.id ?? null,
            username: msg.from?.username ?? null,
            first_name: contact.first_name ?? msg.from?.first_name ?? null,
          },
          { onConflict: "phone" },
        );
        await admin.from("clients").upsert({ phone }, { onConflict: "phone" });
        // Подтвердить ожидающий запрос входа от этого чата.
        const { data: pending } = await admin
          .from("auth_otp")
          .select("id")
          .eq("chat_id", chatId)
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (pending) {
          await admin.from("auth_otp").update({ status: "confirmed", phone, used_at: new Date().toISOString() }).eq("id", pending.id);
        }
      }
      await tg("sendMessage", {
        chat_id: chatId,
        text: "✅ Готово! Вернитесь на сайт — вход подтверждён.",
        reply_markup: { remove_keyboard: true },
      });
      return res.status(200).json({ ok: true });
    }

    // ── Нажата кнопка «Подтвердить вход» ─────────────────────────────────────
    if (update.callback_query) {
      const cq = update.callback_query;
      const data = cq.data || "";
      const chatId = cq.message?.chat?.id;
      if (admin && data.startsWith("confirm_") && data.length <= 220) {
        const token = data.slice(8);
        const { data: row } = await admin.from("auth_otp").select("id, chat_id").eq("token", token).eq("status", "pending").gt("expires_at", new Date().toISOString()).maybeSingle();
        if (row && (!row.chat_id || row.chat_id === chatId)) {
          await admin.from("auth_otp").update({ status: "confirmed", used_at: new Date().toISOString() }).eq("id", row.id);
        }
      }
      await tg("answerCallbackQuery", { callback_query_id: cq.id, text: "Запрос обработан" });
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    // Telegram повторяет апдейты при ошибке — отвечаем 200, чтобы не зациклить.
    return res.status(200).json({ ok: true });
  }
}
