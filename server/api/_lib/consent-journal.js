const RPC_NAME = "record_lead_with_consent";
const REQUIRED_ARGUMENTS = [
  "p_name",
  "p_contact",
  "p_message",
  "p_source",
  "p_contact_hash",
  "p_contact_masked",
  "p_form_id",
  "p_page_url",
  "p_policy_version",
  "p_consent_version",
  "p_document_hash",
  "p_ip",
  "p_user_agent",
];

function resolveSchema(schema, spec, depth = 0) {
  if (!schema || depth > 5) return null;
  if (schema.$ref) {
    const prefix = "#/definitions/";
    const componentsPrefix = "#/components/schemas/";
    let resolved;
    if (schema.$ref.startsWith(prefix)) resolved = spec.definitions?.[schema.$ref.slice(prefix.length)];
    else if (schema.$ref.startsWith(componentsPrefix)) resolved = spec.components?.schemas?.[schema.$ref.slice(componentsPrefix.length)];
    return resolveSchema(resolved, spec, depth + 1);
  }
  return schema;
}

function requestSchema(operation, spec) {
  const bodySchema = operation?.requestBody?.content?.["application/json"]?.schema
    || operation?.requestBody?.content?.["application/*+json"]?.schema;
  if (bodySchema) return resolveSchema(bodySchema, spec);
  const bodyParameter = operation?.parameters?.find((parameter) => parameter.in === "body");
  if (bodyParameter?.schema) return resolveSchema(bodyParameter.schema, spec);
  return null;
}

function hasJournalContract(spec) {
  const operation = spec?.paths?.[`/rpc/${RPC_NAME}`]?.post;
  if (!operation) return { ready: false, reason: "rpc_missing" };

  const schema = requestSchema(operation, spec);
  if (!schema || schema.type !== "object" || !schema.properties) {
    return { ready: false, reason: "rpc_signature_unverified" };
  }
  const properties = new Set(Object.keys(schema.properties));
  const required = new Set(schema.required || []);
  if (REQUIRED_ARGUMENTS.some((name) => !properties.has(name) || !required.has(name))) {
    return { ready: false, reason: "rpc_signature_mismatch" };
  }

  // PostgREST's OpenAPI document is filtered by the authenticated role's
  // privileges. Exposed POST therefore confirms that this role can execute it.
  // Table paths are checked as non-mutating evidence for the function's schema.
  const tables = {
    leads: Boolean(spec.paths?.["/leads"]),
    consent_events: Boolean(spec.paths?.["/consent_events"]),
  };
  if (!tables.leads || !tables.consent_events) {
    return { ready: false, reason: "journal_tables_unverified", tables };
  }
  return { ready: true, reason: "ready", tables };
}

/**
 * Read-only readiness probe: fetch PostgREST's role-filtered OpenAPI document.
 * It checks the journal RPC contract and visible journal tables without calling
 * the write-capable RPC or creating a lead/consent event.
 */
export async function inspectConsentJournal({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const baseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) {
    return { database: "not_configured", rpc: "not_configured", ready: false, tables: null };
  }

  let endpoint;
  try {
    endpoint = new URL("/rest/v1/", baseUrl);
    if (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost" && endpoint.hostname !== "127.0.0.1") {
      return { database: "unavailable", rpc: "unverified", ready: false, tables: null };
    }
  } catch {
    return { database: "unavailable", rpc: "unverified", ready: false, tables: null };
  }

  try {
    const response = await fetchImpl(endpoint, {
      method: "GET",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Accept: "application/openapi+json",
        "Accept-Profile": "public",
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return { database: "unavailable", rpc: "unverified", ready: false, tables: null };
    let spec;
    try {
      spec = await response.json();
    } catch {
      return { database: "ready", rpc: "unverified", ready: false, tables: null };
    }
    const contract = hasJournalContract(spec);
    return {
      database: "ready",
      rpc: contract.ready ? "ready" : contract.reason,
      ready: contract.ready,
      tables: contract.tables || null,
    };
  } catch {
    return { database: "unavailable", rpc: "unverified", ready: false, tables: null };
  }
}

export const consentJournalContract = Object.freeze({ rpc: RPC_NAME, arguments: Object.freeze([...REQUIRED_ARGUMENTS]) });
