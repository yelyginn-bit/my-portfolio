import crypto from "node:crypto";

function decodeBase32(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = String(value || "").toUpperCase().replace(/[^A-Z2-7]/gu, "");
  let bits = "";
  for (const char of clean) bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function codeAt(secret, counter) {
  const buffer = Buffer.alloc(8); buffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, "0");
}

export function verifyTotp(secret, input, now = Date.now()) {
  if (!secret || !/^\d{6}$/u.test(String(input || ""))) return false;
  const counter = Math.floor(now / 30000);
  return [-1, 0, 1].some((shift) => {
    const expected = Buffer.from(codeAt(secret, counter + shift)); const actual = Buffer.from(String(input));
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  });
}
