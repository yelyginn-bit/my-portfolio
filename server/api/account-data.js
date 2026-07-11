import { getAdmin } from "./_lib/db.js";
import { verifySupabaseJwt } from "./_lib/jwt.js";
import { parseCookies, rateLimit, requestIp } from "./_lib/security.js";

const emptySelection = { shootType: "", days: 1, baseItems: [], optionItems: [], urgent: false };
const emptyBreakdown = { subtotalMin: 0, subtotalMax: 0, discountPercent: 0, totalMin: 0, totalMax: 0 };

const orderDto = (order) => ({
  id: order.id,
  createdAt: order.created_at,
  status: order.status,
  selection: order.selection_json || emptySelection,
  breakdown: order.breakdown_json || emptyBreakdown,
  comment: order.comment || undefined,
  paymentConfirmedAt: order.payment_confirmed_at || undefined,
  receiptStatus: order.receipt_status || "not_required",
  receiptIssuedAt: order.receipt_issued_at || undefined,
  receiptSentAt: order.receipt_sent_at || undefined,
});

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false });
  if (!rateLimit(`account-data:${requestIp(req)}`, { limit: 120, windowMs: 10 * 60 * 1000 })) return res.status(429).json({ ok: false, error: "Слишком много запросов" });
  const claims = verifySupabaseJwt(parseCookies(req).yel_session, process.env.SUPABASE_JWT_SECRET);
  const admin = getAdmin();
  if (!claims?.sub || !admin) return res.status(401).json({ ok: false, error: "Требуется вход" });

  const { data: client } = await admin.from("clients").select("id,name,created_at").eq("user_id", claims.sub).maybeSingle();
  if (!client) return res.status(401).json({ ok: false, error: "Требуется вход" });
  const { data: orders, error } = await admin.from("orders").select("id,status,selection_json,breakdown_json,comment,payment_confirmed_at,receipt_status,receipt_issued_at,receipt_sent_at,created_at").eq("client_id", client.id).neq("source", "shop").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ ok: false, error: "Не удалось загрузить кабинет" });
  const completedOrders = (orders || []).filter((order) => order.status === "done").length;
  return res.status(200).json({ ok: true, client: { id: client.id, name: client.name || undefined, createdAt: client.created_at, completedOrders }, orders: (orders || []).map(orderDto) });
}
