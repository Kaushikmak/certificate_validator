import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { auth } from "@/lib/auth";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, recipientEmail, permission, expiresAt } = body as {
      documentId?: string;
      recipientEmail?: string;
      permission?: "view" | "download";
      expiresAt?: string;
    };

    if (!documentId || !recipientEmail || !permission) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : undefined;
    if (expiresAt && Number.isNaN(expiresAtMs)) {
      return NextResponse.json({ error: "Invalid share expiry date" }, { status: 400 });
    }

    const shareId = await convex.mutation(api.shares.createShare, {
      documentId: documentId as any,
      ownerUserId: session.user.id,
      recipientEmail,
      permission,
      expiresAt: expiresAtMs,
    });

    return NextResponse.json({ success: true, shareId });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create share" }, { status: 500 });
  }
}
