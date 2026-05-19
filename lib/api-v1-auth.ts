import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { constantTimeEqualHex, getKeyPrefix, hashApiKey } from "@/lib/api-key";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function authenticateApiKey(request: Request) {
  const rawKey = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!rawKey) {
    return { ok: false as const, error: "Missing API key" };
  }

  const keyPrefix = getKeyPrefix(rawKey);
  const key = await convex.query((api as any).apiKeys.getByPrefix, { keyPrefix });
  if (!key || (key.status && key.status !== "active")) {
    return { ok: false as const, error: "Invalid API key" };
  }

  const candidateHash = hashApiKey(rawKey);
  if (!constantTimeEqualHex(candidateHash, key.keyHash)) {
    return { ok: false as const, error: "Invalid API key" };
  }

  await convex.mutation((api as any).apiKeys.touchLastUsed, { keyId: key._id });
  return {
    ok: true as const,
    ownerUserId: key.ownerUserId,
    ownerEmail: key.ownerEmail,
  };
}
