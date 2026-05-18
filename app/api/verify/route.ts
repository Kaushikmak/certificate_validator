// app/api/verify/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploadedFileHash = crypto.createHash("sha256").update(buffer).digest("hex");

    // 1. Look up the document using raw SQL
    // We cast the result to an object so TypeScript knows what properties exist
    const localRecord = db.prepare('SELECT * FROM documents WHERE fileHash = ?').get(uploadedFileHash) as { hederaSequence: string } | undefined;

    if (!localRecord || !localRecord.hederaSequence) {
      return NextResponse.json({ 
        verified: false, message: "Document not found in registry. It may be forged or tampered with." 
      });
    }

    // ... (The rest of the Hedera Mirror node fetch logic stays exactly the same)
    const topicId = process.env.NEXT_PUBLIC_HEDERA_TOPIC_ID || process.env.HEDERA_TOPIC_ID;
    if (!topicId) {
      return NextResponse.json({ error: "Hedera Topic ID is not configured" }, { status: 500 });
    }
    const mirrorNodeUrl = process.env.NEXT_PUBLIC_HEDERA_MIRROR_NODE_URL || "https://testnet.mirrornode.hedera.com";
    
    const hederaRes = await fetch(`${mirrorNodeUrl}/api/v1/topics/${topicId}/messages/${localRecord.hederaSequence}`);
    
    if (!hederaRes.ok) throw new Error("Failed to fetch data from Hedera Mirror Node");

    const hederaData = await hederaRes.json();
    const decodedMessage = Buffer.from(hederaData.message, "base64").toString("utf-8");
    const onChainData = JSON.parse(decodedMessage);

    if (onChainData.hash === uploadedFileHash) {
      return NextResponse.json({
        verified: true,
        message: "Document is authentic and verified on the Hedera network.",
        documentDetails: {
          title: onChainData.title,
          issuer: onChainData.issuer,
          timestamp: onChainData.timestamp,
          sequence: localRecord.hederaSequence,
        }
      });
    } else {
      return NextResponse.json({ verified: false, message: "Hashes do not match. The document has been tampered with." });
    }

  } catch (error) {
    console.error("Verification Error:", error);
    return NextResponse.json({ error: "An error occurred during verification." }, { status: 500 });
  }
}