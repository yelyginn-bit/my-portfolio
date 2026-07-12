import { getAdmin } from "./_lib/db.js";
import { hasBot } from "./_lib/telegram.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false });

  const admin = getAdmin();
  let database = false;
  if (admin) {
    try {
      const { error } = await admin.from("settings").select("key").limit(1);
      database = !error;
    } catch {
      database = false;
    }
  }

  const checks = {
    database,
    telegram: hasBot() && Boolean(process.env.TELEGRAM_CHAT_ID),
    adminAuth: Boolean(process.env.ADMIN_PASSWORD && process.env.SUPABASE_JWT_SECRET),
    storage: Boolean(
      (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
      || (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET),
    ),
  };

  const ready = Object.values(checks).every(Boolean);
  return res.status(ready ? 200 : 503).json({ ok: ready, checks, timestamp: new Date().toISOString() });
}
