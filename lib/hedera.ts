import { Client, AccountId, PrivateKey } from "@hiero-ledger/sdk";

const accountIdStr = process.env.HEDERA_ACCOUNT_ID;
const privateKeyStr = process.env.HEDERA_PRIVATE_KEY;

if (!accountIdStr || !privateKeyStr) {
  throw new Error("missing hedera credential");
}

const accountId = AccountId.fromString(accountIdStr);
const privateKey = PrivateKey.fromStringECDSA(privateKeyStr);

export const hederaClient = Client.forTestnet();
hederaClient.setOperator(accountId, privateKey);