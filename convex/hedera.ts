// convex/hedera.ts
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Client, PrivateKey, AccountCreateTransaction, Hbar, TopicMessageSubmitTransaction } from "@hiero-ledger/sdk";

export const provisionUserAccount = action({
  args: { email: v.string(), name: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; message: string; accountId: string }> => {

    const existingUser: any = await ctx.runQuery(api.users.getUserInfo, { email: args.email });
    if (existingUser?.hederaAccountId) {
      return { success: true, message: "Account exists", accountId: existingUser.hederaAccountId };
    }

    const treasuryId = process.env.NEXT_PUBLIC_HEDERA_ACCOUNT_ID || process.env.HEDERA_ACCOUNT_ID;
    const treasuryKey = process.env.NEXT_PUBLIC_HEDERA_PRIVATE_KEY || process.env.HEDERA_PRIVATE_KEY;
    
    if (!treasuryId || !treasuryKey) {
      throw new Error("Treasury credentials missing in Convex environment variables.");
    }
    
    const client = Client.forTestnet().setOperator(treasuryId, treasuryKey);

    const newPrivateKey = PrivateKey.generateED25519();
    const newPublicKey = newPrivateKey.publicKey;

    const transaction = new AccountCreateTransaction()
      .setKeyWithoutAlias(newPublicKey)
      .setInitialBalance(new Hbar(10));

    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const newAccountId = receipt.accountId!.toString();

    // 5. Securely save the keys to the Convex database
    await ctx.runMutation(internal.users.upsertUserKeys, {
      email: args.email,
      name: args.name,
      hederaAccountId: newAccountId,
      hederaPrivateKey: newPrivateKey.toString(),
    });

    return { success: true, message: "Account provisioned", accountId: newAccountId };
  }
});

export const publishDocument = action({
  args: {
    email: v.string(),
    userId: v.string(),
    title: v.string(),
    issuer: v.string(),
    description: v.string(),
    documentType: v.string(),
    expiresAt: v.optional(v.number()),
    fileHash: v.string(),
    topicId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; document: { id: string; hederaSequence: string; topicId: string }; fee: string }> => {

    const user: any = await ctx.runQuery(internal.users.getInternalUserKeys, { email: args.email });
    
    if (!user || !user.hederaAccountId || !user.hederaPrivateKey) {
      throw new Error("User Hedera account not fully provisioned yet.");
    }

    const client = Client.forTestnet().setOperator(user.hederaAccountId, user.hederaPrivateKey);

    const hederaMessage = JSON.stringify({
      title: args.title,
      issuer: args.issuer,
      description: args.description,
      documentType: args.documentType,
      expiresAt: args.expiresAt ?? null,
      hash: args.fileHash,
      timestamp: new Date().toISOString(),
    });

    const transaction = new TopicMessageSubmitTransaction()
      .setTopicId(args.topicId)
      .setMessage(hederaMessage);

    const txResponse = await transaction.execute(client);
    
    const record = await txResponse.getRecord(client);
    const feeInHbar = record.transactionFee.toString(); 

    const receipt = await txResponse.getReceipt(client);
    const sequenceNumber = receipt.topicSequenceNumber?.toString() || "unknown";

    // 4. Save the document record directly to Convex
    const docId: any = await ctx.runMutation(api.documents.saveDocument, {
      userId: args.userId,
      title: args.title,
      issuer: args.issuer,
      description: args.description,
      documentType: args.documentType,
      fileHash: args.fileHash,
      hederaSequence: sequenceNumber,
      topicId: args.topicId,
      expiresAt: args.expiresAt,
    });

    return { 
      success: true, 
      document: { id: docId as string, hederaSequence: sequenceNumber, topicId: args.topicId }, 
      fee: feeInHbar 
    };
  }
});
