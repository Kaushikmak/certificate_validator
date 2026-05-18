// app/api/issue/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    // 1. Verify User Session with Better Auth
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const issuer = formData.get("issuer") as string;
    const description = formData.get("description") as string;

    if (!file || !title || !issuer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2. Hash the file locally on the server
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

    // 3. Check for duplicates in Convex
    const existingDoc = await convex.query(api.documents.getByHash, { fileHash });
    if (existingDoc) {
      return NextResponse.json({ 
        exists: true, 
        message: "Document is already registered.",
        document: existingDoc
      }, { status: 200 }); 
    }

    const topicId = process.env.NEXT_PUBLIC_HEDERA_TOPIC_ID || process.env.HEDERA_TOPIC_ID;
    if (!topicId) throw new Error("Topic ID missing");

    // 4. Trigger the secure Convex Action to publish to Hedera
    const result = await convex.action(api.hedera.publishDocument, {
      email: session.user.email,
      userId: session.user.id, // Better Auth User ID
      title,
      issuer,
      description: description || "",
      fileHash,
      topicId: topicId
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Issuance Error:", error);
    return NextResponse.json({ error: error.message || "Failed to register document" }, { status: 500 });
  }
}