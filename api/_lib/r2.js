// Cloudflare R2 через S3-совместимый API. Подпись — aws4fetch (SigV4), без AWS SDK.
// Нужны env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.
// Опц.: R2_PUBLIC_BASE — публичный домен бакета (тогда GET-ссылки не подписываются).
import { AwsClient } from "aws4fetch";

export function r2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBase: process.env.R2_PUBLIC_BASE || "",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  };
}

export function r2Client(cfg) {
  return new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

/** Presigned URL для метода (PUT/GET/DELETE) и ключа. TTL в секундах. */
export async function presign(cfg, method, key, ttl = 600) {
  const client = r2Client(cfg);
  const url = `${cfg.endpoint}/${cfg.bucket}/${encodeURIComponent(key).replace(/%2F/g, "/")}?X-Amz-Expires=${ttl}`;
  const signed = await client.sign(new Request(url, { method }), { aws: { signQuery: true } });
  return signed.url;
}
