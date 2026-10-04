import { inspectConsentJournal } from "./_lib/consent-journal.js";
import { hasBot } from "./_lib/telegram.js";

function runtimeName(env) {
  if (env.YELYGINN_RUNTIME) return String(env.YELYGINN_RUNTIME).slice(0, 40);
  if (env.VERCEL === "1") return "vercel";
  if (env.PM2_HOME || env.pm_id) return "vps";
  return "node";
}

export function createHealthHandler({ inspectConsentJournalFn = inspectConsentJournal, env = process.env } = {}) {
  return async function healthHandler(req, res) {
    if (req.method !== "GET") return res.status(405).json({ ok: false });

    const databaseConfigured = Boolean(
      (env.SUPABASE_URL || env.VITE_SUPABASE_URL) && env.SUPABASE_SERVICE_ROLE_KEY,
    );
    const journal = await inspectConsentJournalFn();
    const telegram = hasBot() && Boolean(env.TELEGRAM_CHAT_ID);
    const relay = env.LEAD_RELAY_ENABLED === "true"
      && Boolean(env.LEAD_RELAY_URL && env.LEAD_RELAY_SECRET);
    const adminAuth = Boolean(env.ADMIN_PASSWORD && env.SUPABASE_JWT_SECRET);
    const storageConfigured = Boolean(
      (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
        || (env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET),
    );
    const publicFormReady = journal.ready && (telegram || relay);
    const checks = {
      runtime: runtimeName(env),
      thisRuntimeResponding: true,
      upstreamMeasured: false,
      database: journal.database === "ready",
      telegram,
      relay,
      consentJournal: {
        rpc: journal.rpc,
        tables: journal.tables,
      },
      configuration: {
        database: databaseConfigured ? "configured" : "not_configured",
        adminAuth: adminAuth ? "configured" : "not_configured",
        storage: storageConfigured ? "configured" : "not_configured",
        telegram: telegram ? "configured" : "not_configured",
        relay: relay ? "configured" : "not_configured",
      },
      dependencies: {
        database: journal.database,
      },
      publicForm: {
        ready: publicFormReady,
        consentJournal: journal.ready,
        telegram,
        relay,
      },
      optional: { adminAuth, storage: storageConfigured },
      adminAuth,
      storage: storageConfigured,
    };

    return res.status(publicFormReady ? 200 : 503).json({
      ok: publicFormReady,
      status: publicFormReady ? "ready" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    });
  };
}

export default createHealthHandler();
