import crypto from "crypto";

const KEY_PREFIX_LENGTH = 12;

export function generateRawApiKey() {
  return `lv_${crypto.randomBytes(32).toString("hex")}`;
}

export function getKeyPrefix(rawKey: string) {
  return rawKey.slice(0, KEY_PREFIX_LENGTH);
}

export function hashApiKey(rawKey: string) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export function constantTimeEqualHex(a: string, b: string) {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}
