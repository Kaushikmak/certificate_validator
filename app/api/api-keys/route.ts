import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { auth } from "@/lib/auth";
import { generateRawApiKey, getKeyPrefix, hashApiKey } from "@/lib/api-key";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await convex.mutation((api as any).apiKeys.cleanupExpiredDeactivatedKeys, {
    ownerUserId: session.user.id,
  });
  const activeKeys = await convex.query((api as any).apiKeys.listActiveApiKeysForUser, {
    ownerUserId: session.user.id,
  });
  const deactivatedKeys = await convex.query((api as any).apiKeys.listDeactivatedApiKeysForUser, {
    ownerUserId: session.user.id,
  });
  return NextResponse.json({ activeKeys, deactivatedKeys });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Default Key";

  const rawKey = generateRawApiKey();
  const keyPrefix = getKeyPrefix(rawKey);
  const keyHash = hashApiKey(rawKey);

  await convex.mutation((api as any).apiKeys.createApiKeyRecord, {
    ownerUserId: session.user.id,
    ownerEmail: session.user.email,
    name,
    keyPrefix,
    keyHash,
    rawKey,
  });

  return NextResponse.json({
    key: rawKey,
    keyPrefix,
    message: "Store this key now. It won't be shown again.",
  });
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get("id");
  if (!keyId) {
    return NextResponse.json({ error: "Missing key id" }, { status: 400 });
  }

  await convex.mutation((api as any).apiKeys.revokeApiKey, {
    keyId: keyId as any,
    ownerUserId: session.user.id,
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const keyId = body.keyId as string | undefined;
  const name = body.name as string | undefined;
  if (!keyId || !name?.trim()) {
    return NextResponse.json({ error: "Missing keyId or name" }, { status: 400 });
  }
  await convex.mutation((api as any).apiKeys.updateApiKeyName, {
    keyId: keyId as any,
    ownerUserId: session.user.id,
    name: name.trim(),
  });
  return NextResponse.json({ success: true });
}

export async function PUT(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const keyId = body.keyId as string | undefined;
  if (!keyId) {
    return NextResponse.json({ error: "Missing keyId" }, { status: 400 });
  }
  await convex.mutation((api as any).apiKeys.reactivateApiKey, {
    keyId: keyId as any,
    ownerUserId: session.user.id,
  });
  return NextResponse.json({ success: true });
}
