import adminLogin from "../server/api/admin-login.js";
import authRequest from "../server/api/auth-request.js";
import authSession from "../server/api/auth-session.js";
import authStatus from "../server/api/auth-status.js";
import authVerify from "../server/api/auth-verify.js";
import download from "../server/api/download.js";
import fileUrl from "../server/api/file-url.js";
import notify from "../server/api/notify.js";
import paymentCreate from "../server/api/payment-create.js";
import paymentStatus from "../server/api/payment-status.js";
import paymentWebhook from "../server/api/payment-webhook.js";
import sendForm from "../server/api/send-form.js";
import streamUploadUrl from "../server/api/stream-upload-url.js";
import telegramSetWebhook from "../server/api/telegram-set-webhook.js";
import telegramWebhook from "../server/api/telegram-webhook.js";
import uploadUrl from "../server/api/upload-url.js";
import yandexDisk from "../server/api/yandex-disk.js";
import csrf from "../server/api/csrf.js";
import sessionLogout from "../server/api/session-logout.js";
import adminReceipt from "../server/api/admin-receipt.js";
import orderCreate from "../server/api/order-create.js";
import galleryAccess from "../server/api/gallery-access.js";
import adminConsentWithdraw from "../server/api/admin-consent-withdraw.js";
import adminShareLink from "../server/api/admin-share-link.js";
import accountData from "../server/api/account-data.js";
import health from "../server/api/health.js";

const handlers = {
  "admin-login": adminLogin,
  "auth-request": authRequest,
  "auth-session": authSession,
  "auth-status": authStatus,
  "auth-verify": authVerify,
  download,
  "file-url": fileUrl,
  notify,
  "payment-create": paymentCreate,
  "payment-status": paymentStatus,
  "payment-webhook": paymentWebhook,
  "send-form": sendForm,
  "stream-upload-url": streamUploadUrl,
  "telegram-set-webhook": telegramSetWebhook,
  "telegram-webhook": telegramWebhook,
  "upload-url": uploadUrl,
  "yandex-disk": yandexDisk,
  csrf,
  "session-logout": sessionLogout,
  "admin-receipt": adminReceipt,
  "order-create": orderCreate,
  "gallery-access": galleryAccess,
  "admin-consent-withdraw": adminConsentWithdraw,
  "admin-share-link": adminShareLink,
  "account-data": accountData,
  health,
};

export default async function handler(req, res) {
  const endpoint = Array.isArray(req.query?.endpoint)
    ? req.query.endpoint[0]
    : req.query?.endpoint;
  const endpointHandler = handlers[endpoint];

  if (!endpointHandler) {
    return res.status(404).json({ ok: false, error: "Not found" });
  }

  return endpointHandler(req, res);
}
