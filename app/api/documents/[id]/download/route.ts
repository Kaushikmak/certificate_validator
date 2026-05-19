import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { auth } from "@/lib/auth";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const documentId = id as any;

    const document = await convex.query(api.documents.getById, { documentId });
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const isOwner = document.userId === session.user.id;
    if (!isOwner) {
      const shares = await convex.query(api.shares.listSharedWithEmail, {
        recipientEmail: session.user.email,
      });

      const validShare = shares.find((share) => {
        const sameDoc = share.documentId === id;
        const notRevoked = !share.revokedAt;
        const notExpired = !share.expiresAt || share.expiresAt > Date.now();
        const canDownload = share.permission === "download";
        return sameDoc && notRevoked && notExpired && canDownload;
      });

      if (!validShare) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const url = await convex.query(api.documents.getDownloadUrl, { documentId });
    if (!url) {
      return NextResponse.json({ error: "No stored file found for this document" }, { status: 404 });
    }

    return NextResponse.redirect(url);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to generate download link" }, { status: 500 });
  }
}
