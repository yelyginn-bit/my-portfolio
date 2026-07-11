// Audit trail (v2): логирование мутаций админа в admin_actions.
// Best-effort: никогда не бросает (не мешает основной операции).
// Критичные операции журналируются серверными endpoint; контентные правки
// защищены административной RLS-сессией.
import { getStore } from "./store";

export async function logAudit(
  action: string,
  details?: { entityType?: string; entityId?: string; before?: unknown; after?: unknown; actor?: string },
): Promise<void> {
  try {
    await getStore().logAdminAction({
      actor: details?.actor || "admin",
      action,
      entityType: details?.entityType,
      entityId: details?.entityId,
      before: details?.before,
      after: details?.after,
    });
  } catch {
    /* журнал не должен ломать операцию */
  }
}
