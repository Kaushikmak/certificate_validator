import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { authenticateApiKey } from "@/lib/api-v1-auth";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const title = body.title as string | undefined;
  const issuer = body.issuer as string | undefined;
  const description = (body.description as string | undefined) || "";
  const fileHash = body.fileHash as string | undefined;
  const documentType = (body.documentType as string | undefined) || "certificate";
  const expiresAtRaw = body.expiresAt as string | undefined;

  if (!title || !issuer || !fileHash) {
    return NextResponse.json({ error: "Missing required fields: title, issuer, fileHash" }, { status: 400 });
  }

  const existingDoc = await convex.query(api.documents.getByHash, { fileHash });
  if (existingDoc) {
    return NextResponse.json({ exists: true, message: "Document already registered", document: existingDoc });
  }

  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw).getTime() : undefined;
  if (expiresAtRaw && Number.isNaN(expiresAt)) {
    return NextResponse.json({ error: "Invalid expiresAt" }, { status: 400 });
  }

  const topicId = process.env.NEXT_PUBLIC_HEDERA_TOPIC_ID || process.env.HEDERA_TOPIC_ID;
  if (!topicId) {
    return NextResponse.json({ error: "Topic ID missing" }, { status: 500 });
  }

  const result = await convex.action(api.hedera.publishDocument, {
    email: auth.ownerEmail,
    userId: auth.ownerUserId,
    title,
    issuer,
    description,
    documentType,
    expiresAt,
    fileHash,
    topicId,
  });

  return NextResponse.json(result);
}
