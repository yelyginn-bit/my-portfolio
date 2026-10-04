import { getAdmin } from "./_lib/db.js";
import { hasBot } from "./_lib/telegram.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false });

  const admin = getAdmin();
  const databaseConfigured = Boolean(
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)
      && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  let database = false;
  if (admin) {
    try {
      const { error } = await admin.from("settings").select("key").limit(1);
      database = !error;
    } catch {
      database = false;
    }
  }

  const telegram = hasBot() && Boolean(process.env.TELEGRAM_CHAT_ID);
  const relay = process.env.LEAD_RELAY_ENABLED === "true"
    && Boolean(process.env.LEAD_RELAY_URL && process.env.LEAD_RELAY_SECRET);
  const delivery = telegram || relay;
  const adminAuth = Boolean(process.env.ADMIN_PASSWORD && process.env.SUPABASE_JWT_SECRET);
  const storageConfigured = Boolean(
    (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
      || (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET),
  );
  const storage = storageConfigured;

  // The consent journal and Telegram delivery are required for the public form.
  // Admin auth and private-gallery storage belong to deferred capabilities and
  // must not make the public site look offline.
  const publicFormReady = database && delivery;
  const checks = {
    siteAvailable: true,
    database,
    telegram,
    relay,
    configuration: {
      database: databaseConfigured ? "configured" : "not_configured",
      adminAuth: adminAuth ? "configured" : "not_configured",
      storage: storageConfigured ? "configured" : "not_configured",
      telegram: telegram ? "configured" : "not_configured",
      relay: relay ? "configured" : "not_configured",
    },
    dependencies: {
      database: !databaseConfigured ? "not_configured" : database ? "ready" : "unavailable",
    },
    publicForm: {
      ready: publicFormReady,
      consentJournal: database,
      telegram,
      relay,
    },
    optional: { adminAuth, storage },
    adminAuth,
    storage,
  };

  return res.status(publicFormReady ? 200 : 503).json({
    ok: publicFormReady,
    status: publicFormReady ? "ready" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
  });
}
