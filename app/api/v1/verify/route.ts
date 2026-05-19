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
  const fileHash = body.fileHash as string | undefined;
  if (!fileHash) {
    return NextResponse.json({ error: "Missing fileHash" }, { status: 400 });
  }

  const document = await convex.query(api.documents.getByHash, { fileHash });
  if (!document) {
    return NextResponse.json({ verified: false, message: "Not found" });
  }

  const isExpired = !!document.expiresAt && document.expiresAt < Date.now();
  if (isExpired) {
    return NextResponse.json({ verified: false, message: "Document expired", document });
  }

  return NextResponse.json({ verified: true, document });
}
