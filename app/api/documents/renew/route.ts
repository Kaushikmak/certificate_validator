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
    const { documentId, newExpiresAt } = body as {
      documentId?: string;
      newExpiresAt?: string;
    };

    if (!documentId || !newExpiresAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newExpiresAtMs = new Date(newExpiresAt).getTime();
    if (Number.isNaN(newExpiresAtMs)) {
      return NextResponse.json({ error: "Invalid renewal date" }, { status: 400 });
    }

    await convex.mutation(api.documents.renewDocument, {
      documentId: documentId as any,
      ownerUserId: session.user.id,
      newExpiresAt: newExpiresAtMs,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to renew document" }, { status: 500 });
  }
}
