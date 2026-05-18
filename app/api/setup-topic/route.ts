import { NextResponse } from "next/server";
import { TopicCreateTransaction } from "@hiero-ledger/sdk"
import { hederaClient } from "@/lib/hedera";

export async function GET() {
  try {
    const transaction = new TopicCreateTransaction();
    const txResponse = await transaction.execute(hederaClient);
    const receipt = await txResponse.getReceipt(hederaClient);
    const topicId = receipt.topicId;

    return NextResponse.json({
      success: true,
      message: "HCS Topic created successfully",
      topicId: topicId?.toString(),
      action: "Copy the topicId and add it to your .env file."
    });
  } catch (error) {
    console.error("Hedera Error:", error);
    return NextResponse.json(
      { success: false, error: "failed to create topic" },
      { status: 500 }
    );
  }
}