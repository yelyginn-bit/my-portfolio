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

    const body = readJsonBody(req);
    const { name, contact, message, service, website, source, consentAccepted, consentVersion, policyVersion, formId, pageUrl } = body;

    const relaySecret = process.env.LEAD_RELAY_SECRET || '';
    const trustedRelay = Boolean(relaySecret && req.headers?.['x-yelyginn-relay-secret'] === relaySecret);
    if (!trustedRelay && !verifyCsrf(req)) return res.status(403).json({ ok: false, error: 'Обновите страницу и повторите отправку' });
    if (consentAccepted !== true || !ACTIVE_CONSENT_VERSIONS.has(String(consentVersion)) || !ACTIVE_POLICY_VERSIONS.has(String(policyVersion)) || !ALLOWED_FORMS.has(String(formId))) {
      return res.status(400).json({ ok: false, error: 'Необходимо подтвердить действующее согласие на обработку данных' });
    }

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
    const trimmedService = trimTo(service, 160);
    const trimmedSource = trimTo(source || 'site', 120);
    if (trimmedName.length < 2 || trimmedMessage.length < 5 || !isValidContact(trimmedContact)) {
      return res.status(400).json({ ok: false, error: 'Проверьте имя, контакт и описание задачи' });
    }

    const ip = requestIp(req);
    if (!trustedRelay && !rateLimit(`lead:${ip}`, { limit: 5, windowMs: 10 * 60 * 1000 })) {
      return res.status(429).json({ ok: false, error: 'Слишком много заявок. Попробуйте позже.' });
    }

    const normalizedContact = trimmedContact.toLowerCase().replace(/\s+/gu, '');
    const contactMasked = normalizedContact.includes('@')
      ? `${normalizedContact.slice(0, 2)}***${normalizedContact.slice(normalizedContact.indexOf('@'))}`
      : `***${normalizedContact.replace(/\D/gu, '').slice(-4)}`;
    const safePage = String(pageUrl || source || '/').split('?')[0].slice(0, 240);
    const userAgent = trimTo(req.headers?.['user-agent'] || '', 400);
    const documentHash = sha256(`policy:${policyVersion}|consent:${consentVersion}`);
    const admin = getAdmin();
    let leadId = null;
    if (admin && !trustedRelay) {
      const result = await admin.rpc('record_lead_with_consent', {
        p_name: trimmedName,
        p_contact: trimmedContact,
        p_message: `${trimmedService ? `${trimmedService}: ` : ''}${trimmedMessage}`,
        p_source: trimmedSource,
        p_contact_hash: sha256(normalizedContact),
        p_contact_masked: contactMasked,
        p_form_id: String(formId),
        p_page_url: safePage,
        p_policy_version: String(policyVersion),
        p_consent_version: String(consentVersion),
        p_document_hash: documentHash,
        p_ip: ip,
        p_user_agent: userAgent,
      });
      if (result.error) return res.status(503).json({ ok: false, error: 'Не удалось зарегистрировать согласие. Попробуйте позже.' });
      leadId = result.data;
    } else if (!trustedRelay && process.env.REQUIRE_CONSENT_JOURNAL === 'true') {
      return res.status(503).json({ ok: false, error: 'Сервис заявок временно недоступен' });
    }

    const relayUrl = process.env.LEAD_RELAY_URL || '';
    if (!trustedRelay && process.env.LEAD_RELAY_ENABLED === 'true' && relayUrl && relaySecret) {
      const relayResponse = await fetch(relayUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Yelyginn-Relay-Secret': relaySecret }, body: JSON.stringify(body) });
      if (!relayResponse.ok) {
        if (admin && leadId) await admin.from('leads').update({ delivery_status: 'failed' }).eq('id', leadId);
        return res.status(502).json({ ok: false, error: 'Не удалось доставить уведомление. Попробуйте позже.' });
      }
      if (admin && leadId) await admin.from('leads').update({ delivery_status: 'sent' }).eq('id', leadId);
      return res.status(200).json({ ok: true, message: 'Заявка принята', leadId });
    }

    if (!botToken || !chatId) return res.status(503).json({ error: 'Сервис заявок временно недоступен', ok: false });

    const telegramText = [
      '<b>НОВАЯ ЗАЯВКА // YELYGINN</b>',
      '',
      `<b>Имя:</b>\n${escapeHtml(trimmedName)}`,
      `<b>Контакт:</b>\n${escapeHtml(trimmedContact)}`,
      ...(trimmedService ? [`<b>Услуга:</b>\n${escapeHtml(trimmedService)}`] : []),
      '<b>Проект:</b>',
      `<i>${escapeHtml(trimmedMessage)}</i>`,
      '',
      `<b>Источник:</b> yelyginn.ru${escapeHtml(safePage.startsWith('/') ? safePage : `/${safePage}`)}`,
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
      if (admin && leadId) await admin.from('leads').update({ delivery_status: 'failed' }).eq('id', leadId);
      return res.status(502).json({ error: 'Не удалось доставить уведомление. Попробуйте позже.', ok: false });
    }

    if (admin && leadId) await admin.from('leads').update({ delivery_status: 'sent' }).eq('id', leadId);

    return res.status(200).json({
      ok: true,
      message: 'Заявка принята',
      leadId,
    });

  } catch (error) {
    console.error('[send-form]', error instanceof Error ? error.name : 'unknown');
    return res.status(500).json({ error: 'Не удалось обработать заявку', ok: false });
  }
}
import { getAdmin } from "./_lib/db.js";
import { readJsonBody, sha256 } from "./_lib/util.js";
import { rateLimit, requestIp, verifyCsrf } from "./_lib/security.js";

const ACTIVE_POLICY_VERSIONS = new Set(['2.0']);
const ACTIVE_CONSENT_VERSIONS = new Set(['1.0']);
const ALLOWED_FORMS = new Set(['homepage-contact', 'calculator-lead', 'data-request']);
