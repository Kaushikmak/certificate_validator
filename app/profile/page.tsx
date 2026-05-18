// app/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function ProfilePage() {
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  
  // Fetch user info and documents from Convex
  const userInfo = useQuery(api.users.getUserInfo, 
    session?.user?.email ? { email: session.user.email } : "skip"
  );
  
  const documents = useQuery(api.documents.getUserDocuments, 
    session?.user?.id ? { userId: session.user.id } : "skip"
  );

  const [balance, setBalance] = useState<string | null>(null);

  // Fetch live HBAR balance from the public Hedera Mirror Node
  useEffect(() => {
    if (userInfo?.hederaAccountId) {
      fetch(`https://testnet.mirrornode.hedera.com/api/v1/balances?account.id=${userInfo.hederaAccountId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.balances && data.balances.length > 0) {
            // Hedera balances are returned in tinybars. Divide by 100,000,000 to get HBAR.
            const hbar = (data.balances[0].balance / 100000000).toFixed(4);
            setBalance(hbar);
          }
        })
        .catch(console.error);
    }
  }, [userInfo?.hederaAccountId]);

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
      
      {/* Minimal Navbar */}
      <header className="flex-none h-16 border-b border-black px-6 sm:px-12 flex items-center justify-between bg-white z-20">
        <div className="font-bold tracking-tight text-xl">
          LedgerVerify
        </div>
        <nav>
          <Link 
            href="/" 
            className="text-sm font-medium hover:underline underline-offset-4"
          >
            ← Back to Register
          </Link>
        </nav>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center p-4 sm:p-12">
        <div className="w-full max-w-5xl mt-4 sm:mt-8 space-y-12">
          
          {/* Section 1: User Profile & Hedera Wallet */}
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
                      <a 
                        href={`https://hashscan.io/testnet/account/${userInfo.hederaAccountId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold uppercase border-2 border-black px-3 py-1 hover:bg-black hover:text-white transition-none"
                      >
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
                  {balance ? `${balance} HBAR` : "Loading..."}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Registered Documents History */}
          <div className="border-2 border-black bg-white">
            <div className="border-b-2 border-black p-6">
              <h2 className="text-2xl font-bold tracking-tight uppercase">My Documents</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-black/5">
                    <th className="p-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap">Title</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap">Issuer</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap">Topic Sequence</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-xs whitespace-nowrap text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {documents === undefined ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center font-bold uppercase tracking-widest text-black/50">
                        Loading Ledger Data...
                      </td>
                    </tr>
                  ) : documents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center font-bold uppercase tracking-widest text-black/50">
                        No documents registered yet.
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc, idx) => (
                      <tr key={doc._id} className={idx !== documents.length - 1 ? "border-b border-black/20" : ""}>
                        <td className="p-4 font-medium">{doc.title}</td>
                        <td className="p-4">{doc.issuer}</td>
                        <td className="p-4 font-mono font-bold">{doc.hederaSequence}</td>
                        <td className="p-4 text-right">
                          <a 
                            href={`https://hashscan.io/testnet/topic/${doc.topicId}?p=${doc.hederaSequence}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold uppercase underline underline-offset-4 hover:bg-black hover:text-white px-2 py-1"
                          >
                            View Proof
                          </a>
                        </td>
                      </tr>
                    ))
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