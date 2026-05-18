// app/api/verify/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided for verification." }, { status: 400 });
    }

    // 1. Calculate the SHA-256 hash of the uploaded file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

    // 2. Query Convex to see if this hash has been anchored to Hedera
    const document = await convex.query(api.documents.getByHash, { fileHash });

    // 3. Return a stark verification status payload
    if (!document) {
      return NextResponse.json({
        verified: false,
        message: "Verification Failed. This document hash does not exist on the ledger. It may have been tampered with or was never registered.",
      });
    }

    return NextResponse.json({
      verified: true,
      documentDetails: {
        title: document.title,
        issuer: document.issuer,
        sequence: document.hederaSequence,
        topicId: document.topicId,
        timestamp: document._creationTime, // Using Convex native creation timestamp
      },
    });

  } catch (error: any) {
    console.error("Verification Route Error:", error);
    return NextResponse.json({ error: "Internal verification server error." }, { status: 500 });
  }
}