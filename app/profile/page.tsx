"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Eye, EyeOff } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type Permission = "view" | "download";
type ToastType = "success" | "error";

type UiToast = {
  message: string;
  type: ToastType;
};

export default function ProfilePage() {
  const { data: session, isPending: isAuthPending } = authClient.useSession();

  const userInfo = useQuery(
    api.users.getUserInfo,
    session?.user?.email ? { email: session.user.email } : "skip",
  );

  const documents = useQuery(
    api.documents.getUserDocuments,
    session?.user?.id ? { userId: session.user.id } : "skip",
  );

  const [balance, setBalance] = useState<string | null>(null);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
  const [activeApiKeys, setActiveApiKeys] = useState<any[]>([]);
  const [deactivatedApiKeys, setDeactivatedApiKeys] = useState<any[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(true);
  const [uiToast, setUiToast] = useState<UiToast | null>(null);

  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("Production Key");
  const [renameModalKeyId, setRenameModalKeyId] = useState<string | null>(null);
  const [renameModalName, setRenameModalName] = useState("");

  const [renewModalDocId, setRenewModalDocId] = useState<string | null>(null);
  const [renewDate, setRenewDate] = useState("");

  const [shareModalDocId, setShareModalDocId] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState<Permission>("download");
  const [shareExpiry, setShareExpiry] = useState("");

  const [revealedKeyIds, setRevealedKeyIds] = useState<Record<string, boolean>>({});

  const showToast = (message: string, type: ToastType) => {
    setUiToast({ message, type });
  };

  useEffect(() => {
    if (!uiToast) return;
    const timer = setTimeout(() => setUiToast(null), 5000);
    return () => clearTimeout(timer);
  }, [uiToast]);

  useEffect(() => {
    if (userInfo?.hederaAccountId) {
      fetch(`https://testnet.mirrornode.hedera.com/api/v1/balances?account.id=${userInfo.hederaAccountId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.balances && data.balances.length > 0) {
            const hbar = (data.balances[0].balance / 100000000).toFixed(4);
            setBalance(hbar);
          }
        })
        .catch(() => setBalance(null));
    }
  }, [userInfo?.hederaAccountId]);

  const refreshApiKeys = async () => {
    if (!session?.user) return;
    setApiKeysLoading(true);
    const res = await fetch("/api/api-keys");
    const data = await res.json();
    setActiveApiKeys(data.activeKeys || []);
    setDeactivatedApiKeys(data.deactivatedKeys || []);
    setApiKeysLoading(false);
  };

  useEffect(() => {
    refreshApiKeys().catch(() => {
      setActiveApiKeys([]);
      setDeactivatedApiKeys([]);
      setApiKeysLoading(false);
    });
  }, [session?.user]);

  const createApiKey = async (name: string) => {
    if (!name.trim()) {
      showToast("Key name is required.", "error");
      return;
    }
    const response = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await response.json();
    if (!response.ok) {
      showToast(data.error || "Failed to create key", "error");
      return;
    }
    showToast("API key created.", "success");
    await refreshApiKeys();
    setKeyModalOpen(false);
  };

  const revokeApiKey = async (id: string) => {
    const response = await fetch(`/api/api-keys?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      showToast(data.error || "Failed to revoke key", "error");
      return;
    }
    showToast("API key revoked.", "success");
    await refreshApiKeys();
  };

  const reactivateApiKey = async (id: string) => {
    const response = await fetch("/api/api-keys", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keyId: id }),
    });
    const data = await response.json();
    if (!response.ok) {
      showToast(data.error || "Failed to reactivate key", "error");
      return;
    }
    showToast("API key restored to active.", "success");
    await refreshApiKeys();
  };

  const updateApiKeyName = async (id: string, nextName: string) => {
    if (!nextName || !nextName.trim()) return;
    const response = await fetch("/api/api-keys", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keyId: id, name: nextName.trim() }),
    });
    const data = await response.json();
    if (!response.ok) {
      showToast(data.error || "Failed to update key name", "error");
      return;
    }
    showToast("API key updated.", "success");
    await refreshApiKeys();
    setRenameModalKeyId(null);
    setRenameModalName("");
  };

  const copyKey = async (key: string | undefined) => {
    if (!key) {
      showToast("No full key stored for this record.", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(key);
      showToast("Key copied to clipboard.", "success");
    } catch {
      showToast("Failed to copy key.", "error");
    }
  };

  const renewDocument = async (documentId: string, newExpiry: string) => {
    if (!newExpiry) {
      showToast("Expiry date is required.", "error");
      return;
    }

    setBusyDocId(documentId);
    try {
      const response = await fetch("/api/documents/renew", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId, newExpiresAt: newExpiry }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to renew");
      showToast("Document renewed successfully.", "success");
      window.location.reload();
    } catch (error: any) {
      showToast(error?.message || "Failed to renew", "error");
    } finally {
      setBusyDocId(null);
    }
  };

  const shareDocument = async (
    documentId: string,
    recipientEmail: string,
    permission: Permission,
    expiresAt?: string,
  ) => {
    if (!recipientEmail.trim()) {
      showToast("Recipient email is required.", "error");
      return;
    }

    setBusyDocId(documentId);
    try {
      const response = await fetch("/api/documents/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          documentId,
          recipientEmail: recipientEmail.trim(),
          permission,
          expiresAt: expiresAt || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to share");
      showToast("Share created.", "success");
    } catch (error: any) {
      showToast(error?.message || "Failed to share", "error");
    } finally {
      setBusyDocId(null);
    }
  };

  if (isAuthPending) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-black font-bold uppercase tracking-widest">Loading Session...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center flex-col gap-4">
        <p className="text-black font-bold uppercase tracking-widest text-xl">Access Denied</p>
        <Link href="/" className="border-2 border-black px-6 py-2 font-bold uppercase hover:bg-black hover:text-white">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full bg-white text-black flex flex-col font-sans selection:bg-black selection:text-white">
      {uiToast && (
        <div
          className={`fixed bottom-4 right-4 z-50 border-2 p-3 max-w-sm text-sm text-white ${
            uiToast.type === "success" ? "bg-green-600 border-green-700" : "bg-red-600 border-red-700"
          }`}
        >
          <div className="flex items-start gap-3">
            <p className="font-medium">{uiToast.message}</p>
            <button type="button" onClick={() => setUiToast(null)} className="font-bold">
              ×
            </button>
          </div>
        </div>
      )}

      {keyModalOpen && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md border-2 border-black bg-white p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold tracking-tight uppercase">Create API Key</h2>
              <button onClick={() => setKeyModalOpen(false)} className="text-black font-bold text-xl">×</button>
            </div>
            <div className="space-y-3">
              <label htmlFor="newKeyName" className="text-black font-bold uppercase tracking-wider text-xs">Key Name</label>
              <input id="newKeyName" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} className="w-full border-2 border-black rounded-none h-12 px-3" />
              <button type="button" onClick={() => createApiKey(newKeyName)} className="w-full bg-black text-white rounded-none h-12 font-bold uppercase">
                Generate Key
              </button>
            </div>
          </div>
        </div>
      )}
      {renameModalKeyId && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md border-2 border-black bg-white p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold tracking-tight uppercase">Edit API Key</h2>
              <button onClick={() => setRenameModalKeyId(null)} className="text-black font-bold text-xl">×</button>
            </div>
            <div className="space-y-3">
              <label htmlFor="renameKeyName" className="text-black font-bold uppercase tracking-wider text-xs">Key Name</label>
              <input id="renameKeyName" value={renameModalName} onChange={(e) => setRenameModalName(e.target.value)} className="w-full border-2 border-black rounded-none h-12 px-3" />
              <button type="button" onClick={() => updateApiKeyName(renameModalKeyId, renameModalName)} className="w-full bg-black text-white rounded-none h-12 font-bold uppercase">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {renewModalDocId && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md border-2 border-black bg-white p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold tracking-tight uppercase">Renew Document</h2>
              <button onClick={() => setRenewModalDocId(null)} className="text-black font-bold text-xl">×</button>
            </div>
            <div className="space-y-3">
              <label htmlFor="renewDate" className="text-black font-bold uppercase tracking-wider text-xs">New Expiry Date</label>
              <input id="renewDate" type="date" value={renewDate} onChange={(e) => setRenewDate(e.target.value)} className="w-full border-2 border-black rounded-none h-12 px-3" />
              <button
                type="button"
                onClick={async () => {
                  await renewDocument(renewModalDocId, renewDate);
                  setRenewModalDocId(null);
                  setRenewDate("");
                }}
                className="w-full bg-black text-white rounded-none h-12 font-bold uppercase"
              >
                Confirm Renewal
              </button>
            </div>
          </div>
        </div>
      )}

      {shareModalDocId && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md border-2 border-black bg-white p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold tracking-tight uppercase">Share Document</h2>
              <button onClick={() => setShareModalDocId(null)} className="text-black font-bold text-xl">×</button>
            </div>
            <div className="space-y-3">
              <label htmlFor="shareEmail" className="text-black font-bold uppercase tracking-wider text-xs">Recipient Email</label>
              <input id="shareEmail" type="email" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} className="w-full border-2 border-black rounded-none h-12 px-3" />
              <label htmlFor="sharePermission" className="text-black font-bold uppercase tracking-wider text-xs">Permission</label>
              <select id="sharePermission" value={sharePermission} onChange={(e) => setSharePermission(e.target.value as Permission)} className="w-full border-2 border-black rounded-none h-12 px-3">
                <option value="view">View</option>
                <option value="download">Download</option>
              </select>
              <label htmlFor="shareExpiry" className="text-black font-bold uppercase tracking-wider text-xs">Share Expiry Date (Optional)</label>
              <input id="shareExpiry" type="date" value={shareExpiry} onChange={(e) => setShareExpiry(e.target.value)} className="w-full border-2 border-black rounded-none h-12 px-3" />
              <button
                type="button"
                onClick={async () => {
                  await shareDocument(shareModalDocId, shareEmail, sharePermission, shareExpiry || undefined);
                  setShareModalDocId(null);
                  setShareEmail("");
                  setSharePermission("download");
                  setShareExpiry("");
                }}
                className="w-full bg-black text-white rounded-none h-12 font-bold uppercase"
              >
                Create Share
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex-none h-16 border-b border-black px-6 sm:px-12 flex items-center justify-between bg-white z-20">
        <div className="font-bold tracking-tight text-xl">LedgerVerify</div>
        <nav>
          <Link href="/" className="text-sm font-medium hover:underline underline-offset-4">
            ← Back to Register
          </Link>
        </nav>
      </header>

      <div className="flex-1 flex flex-col items-center p-4 sm:p-12">
        <div className="w-full max-w-5xl mt-4 sm:mt-8 space-y-12">
          <div className="border-2 border-black bg-white">
            <div className="border-b-2 border-black bg-black text-white p-6">
              <h1 className="text-2xl font-bold tracking-tight uppercase">User Profile</h1>
            </div>
            <div className="p-6 sm:p-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b-2 border-black/10 pb-6">
                <div className="font-bold uppercase tracking-wider text-xs text-black/60">Account Email</div>
                <div className="md:col-span-2 font-medium text-lg">{session.user.email}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b-2 border-black/10 pb-6">
                <div className="font-bold uppercase tracking-wider text-xs text-black/60">Hedera Account ID</div>
                <div className="md:col-span-2">
                  {userInfo === undefined ? (
                    <span className="animate-pulse bg-black/10 h-6 w-32 block" />
                  ) : userInfo?.hederaAccountId ? (
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="font-mono text-xl font-bold">{userInfo.hederaAccountId}</span>
                      <a href={`https://hashscan.io/testnet/account/${userInfo.hederaAccountId}`} target="_blank" rel="noreferrer" className="text-xs font-bold uppercase border-2 border-black px-3 py-1 hover:bg-black hover:text-white transition-none">
                        View on Hashscan
                      </a>
                    </div>
                  ) : (
                    <span className="italic text-black/50">Provisioning your Web3 wallet...</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="font-bold uppercase tracking-wider text-xs text-black/60">Current Balance</div>
                <div className="md:col-span-2 font-mono text-xl font-bold">
                  {balance !== null ? (
                    `${balance} HBAR`
                  ) : (
                    <span className="inline-block h-7 w-36 animate-pulse bg-black/10 align-middle" />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-2 border-black bg-white">
            <div className="border-b-2 border-black p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight uppercase">API Keys</h2>
              <button
                type="button"
                onClick={() => setKeyModalOpen(true)}
                className="text-xs font-bold uppercase border-2 border-black px-3 py-1 hover:bg-black hover:text-white"
              >
                Create Key
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase mb-3">Active API Keys</h3>
              {apiKeysLoading ? (
                <>
                  <div className="border border-black p-3">
                    <div className="h-4 w-32 animate-pulse bg-black/10 mb-2" />
                    <div className="h-3 w-64 animate-pulse bg-black/10 mb-2" />
                    <div className="h-3 w-40 animate-pulse bg-black/10" />
                  </div>
                  <div className="border border-black p-3">
                    <div className="h-4 w-28 animate-pulse bg-black/10 mb-2" />
                    <div className="h-3 w-56 animate-pulse bg-black/10 mb-2" />
                    <div className="h-3 w-44 animate-pulse bg-black/10" />
                  </div>
                </>
              ) : activeApiKeys.length === 0 ? (
                <p className="text-sm text-black/60">No active API keys.</p>
              ) : (
                activeApiKeys.map((key) => {
                  const showRaw = !!revealedKeyIds[key._id];
                  const hasRaw = !!key.rawKey;
                  return (
                    <div key={key._id} className="border border-black p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-sm">{key.name}</div>
                        <div className="font-mono text-xs break-all">
                          {showRaw && hasRaw ? key.rawKey : `${key.keyPrefix}…`}
                        </div>
                        <div className="text-xs text-black/60">
                          Active · Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRevealedKeyIds((prev) => ({ ...prev, [key._id]: !prev[key._id] }))}
                          className="text-xs font-bold uppercase border border-black px-2 py-1 hover:bg-black hover:text-white disabled:opacity-50"
                          disabled={!hasRaw}
                          title={hasRaw ? "Show/hide full key" : "Unavailable for older keys"}
                        >
                          {showRaw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyKey(key.rawKey)}
                          className="text-xs font-bold uppercase border border-black px-2 py-1 hover:bg-black hover:text-white disabled:opacity-50"
                          disabled={!hasRaw}
                          title={hasRaw ? "Copy full key" : "Unavailable for older keys"}
                        >
                          <Copy size={14} />
                        </button>
                        <button type="button" onClick={() => revokeApiKey(key._id)} className="text-xs font-bold uppercase border border-black px-2 py-1 hover:bg-black hover:text-white">
                          Deactivate
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              </div>

              <div className="border-t-2 border-black pt-6">
                <h3 className="text-sm font-bold uppercase mb-3">Previous API Keys</h3>
                {apiKeysLoading ? (
                  <div className="border border-black p-3">
                    <div className="h-4 w-28 animate-pulse bg-black/10 mb-2" />
                    <div className="h-3 w-52 animate-pulse bg-black/10 mb-2" />
                    <div className="h-3 w-48 animate-pulse bg-black/10" />
                  </div>
                ) : deactivatedApiKeys.length === 0 ? (
                  <p className="text-sm text-black/60">No previous/deactivated keys.</p>
                ) : (
                  deactivatedApiKeys.map((key) => {
                    const msLeft = key.deactivatedAt
                      ? Math.max(0, key.deactivatedAt + 24 * 60 * 60 * 1000 - Date.now())
                      : 0;
                    const hrsLeft = Math.floor(msLeft / (60 * 60 * 1000));
                    const minsLeft = Math.floor((msLeft % (60 * 60 * 1000)) / (60 * 1000));
                    return (
                      <div key={key._id} className="border border-black p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-sm">{key.name}</div>
                          <div className="font-mono text-xs break-all">{key.keyPrefix}…</div>
                          <div className="text-xs text-black/60">
                            Deactivated · Auto-delete in {hrsLeft}h {minsLeft}m
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRenameModalKeyId(key._id);
                              setRenameModalName(key.name);
                            }}
                            className="text-xs font-bold uppercase border border-black px-2 py-1 hover:bg-black hover:text-white"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => reactivateApiKey(key._id)}
                            className="text-xs font-bold uppercase border border-black px-2 py-1 hover:bg-black hover:text-white"
                          >
                            Restore
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="border-2 border-black bg-white">
            <div className="border-b-2 border-black p-6">
              <h2 className="text-2xl font-bold tracking-tight uppercase">My Documents</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-black/5">
                    <th className="p-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap">Title</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap">Type</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap">Issuer</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap">Status</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap">Topic Sequence</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {documents === undefined ? (
                    <>
                      <tr>
                        <td className="p-4"><div className="h-4 w-32 animate-pulse bg-black/10" /></td>
                        <td className="p-4"><div className="h-4 w-20 animate-pulse bg-black/10" /></td>
                        <td className="p-4"><div className="h-4 w-28 animate-pulse bg-black/10" /></td>
                        <td className="p-4"><div className="h-4 w-24 animate-pulse bg-black/10" /></td>
                        <td className="p-4"><div className="h-4 w-14 animate-pulse bg-black/10" /></td>
                        <td className="p-4"><div className="h-4 w-40 animate-pulse bg-black/10 ml-auto" /></td>
                      </tr>
                      <tr>
                        <td className="p-4"><div className="h-4 w-36 animate-pulse bg-black/10" /></td>
                        <td className="p-4"><div className="h-4 w-16 animate-pulse bg-black/10" /></td>
                        <td className="p-4"><div className="h-4 w-24 animate-pulse bg-black/10" /></td>
                        <td className="p-4"><div className="h-4 w-28 animate-pulse bg-black/10" /></td>
                        <td className="p-4"><div className="h-4 w-12 animate-pulse bg-black/10" /></td>
                        <td className="p-4"><div className="h-4 w-36 animate-pulse bg-black/10 ml-auto" /></td>
                      </tr>
                    </>
                  ) : documents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center font-bold uppercase tracking-widest text-black/50">No documents registered yet.</td>
                    </tr>
                  ) : (
                    documents.map((doc, idx) => {
                      const isExpired = !!doc.expiresAt && doc.expiresAt < Date.now();
                      const status = isExpired ? "expired" : doc.status;
                      return (
                        <tr key={doc._id} className={idx !== documents.length - 1 ? "border-b border-black/20" : ""}>
                          <td className="p-4 font-medium">{doc.title}</td>
                          <td className="p-4 uppercase text-xs font-bold">{doc.documentType}</td>
                          <td className="p-4">{doc.issuer}</td>
                          <td className="p-4 uppercase text-xs font-bold">{status}{doc.expiresAt ? ` · ${new Date(doc.expiresAt).toLocaleDateString()}` : ""}</td>
                          <td className="p-4 font-mono font-bold">{doc.hederaSequence}</td>
                          <td className="p-4 text-right">
                            <div className="flex gap-2 justify-end flex-wrap">
                              <a href={`/api/documents/${doc._id}/download`} className="text-xs font-bold uppercase underline underline-offset-4 hover:bg-black hover:text-white px-2 py-1">Download</a>
                              <button type="button" onClick={() => setShareModalDocId(doc._id)} disabled={busyDocId === doc._id} className="text-xs font-bold uppercase underline underline-offset-4 hover:bg-black hover:text-white px-2 py-1 disabled:opacity-50">Share</button>
                              <button type="button" onClick={() => setRenewModalDocId(doc._id)} disabled={busyDocId === doc._id} className="text-xs font-bold uppercase underline underline-offset-4 hover:bg-black hover:text-white px-2 py-1 disabled:opacity-50">Renew</button>
                              <a href={`https://hashscan.io/testnet/topic/${doc.topicId}?p=${doc.hederaSequence}`} target="_blank" rel="noreferrer" className="text-xs font-bold uppercase underline underline-offset-4 hover:bg-black hover:text-white px-2 py-1">Proof</a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
