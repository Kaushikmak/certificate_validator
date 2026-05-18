// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { authClient } from "@/lib/auth-client";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Home() {
  // Session & Convex Hooks
  const { data: session } = authClient.useSession();
  const provisionAccount = useAction(api.hedera.provisionUserAccount);
  const userInfo = useQuery(api.users.getUserInfo, 
    session?.user?.email ? { email: session.user.email } : "skip"
  );

  // Document Upload State
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [issuer, setIssuer] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Background Hedera Provisioning
  useEffect(() => {
    const setupHedera = async () => {
      if (session?.user?.email && userInfo === null && !isProvisioning) {
        setIsProvisioning(true);
        try {
          await provisionAccount({ 
            email: session.user.email, 
            name: session.user.name || "User" 
          });
        } catch (error) {
          console.error("Failed to provision Hedera account:", error);
        } finally {
          setIsProvisioning(false);
        }
      }
    };
    setupHedera();
  }, [session, userInfo, isProvisioning, provisionAccount]);

  // Handle Authentication (Login / Register)
  const handleAuth = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({
          email: authEmail,
          password: authPassword,
          name: authName,
        });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await authClient.signIn.email({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw new Error(error.message);
      }
      setShowAuthModal(false);
      setAuthEmail(""); setAuthPassword(""); setAuthName("");
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Document Registration
  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!session) {
      setResult({ error: "You must be signed in to register a document." });
      return;
    }

    if (!file || !title || !issuer) {
      setResult({ error: "Please fill in all required fields." });
      return;
    }

    setIsLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("issuer", issuer);
    formData.append("description", description);

    try {
      const response = await fetch("/api/issue", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong");

      setResult(data);
      if (!data.exists) {
        setFile(null); setTitle(""); setIssuer(""); setDescription("");
      }
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-white text-black flex flex-col font-sans selection:bg-black selection:text-white relative">
      
      {/* Auth Modal Overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md border-2 border-black bg-white p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight uppercase">
                {isSignUp ? "Create Account" : "Sign In"}
              </h2>
              <button onClick={() => setShowAuthModal(false)} className="text-black font-bold text-xl hover:text-black/50">×</button>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="authName" className="font-bold uppercase text-xs">Name</Label>
                  <Input 
                    id="authName" value={authName} onChange={(e) => setAuthName(e.target.value)} required
                    className="border-2 border-black rounded-none h-12 focus-visible:ring-0" 
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="authEmail" className="font-bold uppercase text-xs">Email</Label>
                <Input 
                  id="authEmail" type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required
                  className="border-2 border-black rounded-none h-12 focus-visible:ring-0" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="authPassword" className="font-bold uppercase text-xs">Password</Label>
                <Input 
                  id="authPassword" type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required
                  className="border-2 border-black rounded-none h-12 focus-visible:ring-0" 
                />
              </div>
              
              {authError && <div className="text-sm font-bold bg-black text-white p-3">{authError}</div>}
              
              <Button type="submit" disabled={authLoading} className="w-full bg-black hover:bg-black/80 text-white rounded-none h-12 font-bold uppercase transition-none mt-4">
                {authLoading ? "Processing..." : (isSignUp ? "Sign Up" : "Sign In")}
              </Button>
            </form>
            
            <div className="mt-6 text-center border-t-2 border-black pt-4">
              <button 
                type="button" 
                onClick={() => setIsSignUp(!isSignUp)} 
                className="text-xs font-bold uppercase hover:underline underline-offset-4"
              >
                {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <header className="flex-none h-16 border-b border-black px-6 sm:px-12 flex items-center justify-between bg-white z-20">
        <div className="font-bold tracking-tight text-xl">LedgerVerify</div>
        <nav className="flex items-center gap-4 sm:gap-6">
          <Link href="/verify" className="text-xs sm:text-sm font-bold uppercase tracking-wider hover:bg-black hover:text-white px-2 py-1.5 transition-none border-2 border-transparent hover:border-black">
            Verify
          </Link>
          
          <div className="h-6 w-[2px] bg-black/20" /> 

          {session ? (
            <div className="flex items-center gap-4">
              <Link href="/profile" className="text-xs sm:text-sm font-bold text-black hover:underline underline-offset-4">
                {session.user.name || "Profile"}
              </Link>
              <button onClick={() => authClient.signOut()} className="text-xs font-bold uppercase tracking-wider border-2 border-black px-3 py-1.5 hover:bg-black hover:text-white transition-none hidden sm:block">
                Sign Out
              </button>
            </div>
          ) : (
            <button onClick={() => { setIsSignUp(false); setShowAuthModal(true); }} className="text-xs sm:text-sm font-bold uppercase tracking-wider bg-black text-white px-4 py-1.5 hover:bg-black/80 transition-none">
              Sign In
            </button>
          )}
        </nav>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-12 relative">
        
        {!session ? (
          /* --- THE LANDING PAGE HERO (Logged Out) --- */
          <div className="max-w-4xl text-center space-y-8 mt-8 sm:mt-12">
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tighter uppercase leading-none">
              Immutable <br /> <span className="text-black/30">Notarization.</span>
            </h1>
            <p className="text-base sm:text-xl font-medium max-w-xl mx-auto text-black/70">
              Securely timestamp and verify your documents on the Hedera public ledger. Zero-knowledge proofs, absolute certainty.
            </p>
            <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => { setIsSignUp(true); setShowAuthModal(true); }}
                className="w-full sm:w-auto bg-black text-white px-8 py-4 font-bold uppercase tracking-widest text-sm hover:bg-black/80 transition-none"
              >
                Create Account
              </button>
              <Link 
                href="/verify"
                className="w-full sm:w-auto border-2 border-black text-black px-8 py-4 font-bold uppercase tracking-widest text-sm hover:bg-black hover:text-white transition-none"
              >
                Verify a Document
              </Link>
            </div>
          </div>
        ) : (
          /* --- THE UPLOAD DASHBOARD (Logged In) --- */
          <div className="w-full max-w-4xl border-2 border-black bg-white mt-4 sm:mt-8">
            <div className="border-b-2 border-black p-8 sm:p-10">
              <h1 className="text-3xl font-bold tracking-tight text-black mb-2">Register Document</h1>
              <p className="text-black/70 text-base">Notarize files securely on the immutable Hedera Network.</p>
            </div>
            
            <div className="p-8 sm:p-10">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label htmlFor="title" className="text-black font-bold uppercase tracking-wider text-xs">Document Title *</Label>
                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Q3 Financial Report" className="bg-white border-black border-2 focus-visible:ring-0 focus-visible:border-black focus-visible:outline-none rounded-none h-12 text-base" required />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="issuer" className="text-black font-bold uppercase tracking-wider text-xs">Issuer Name *</Label>
                    <Input id="issuer" value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="e.g., HR Department" className="bg-white border-black border-2 focus-visible:ring-0 focus-visible:border-black focus-visible:outline-none rounded-none h-12 text-base" required />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="description" className="text-black font-bold uppercase tracking-wider text-xs">Description</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add any additional context about this document..." className="bg-white border-black border-2 resize-none h-28 focus-visible:ring-0 focus-visible:border-black focus-visible:outline-none rounded-none text-base" />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="file" className="text-black font-bold uppercase tracking-wider text-xs">Upload PDF Payload *</Label>
                  <div className="flex items-center">
                    <Input id="file" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="bg-white border-black border-2 text-black file:text-black file:bg-white file:border file:border-black file:px-4 file:py-1 file:rounded-none file:font-bold file:mr-4 cursor-pointer hover:file:bg-black hover:file:text-white transition-colors h-14 pt-2.5 rounded-none" required />
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button type="submit" disabled={isLoading} className="w-full bg-black hover:bg-black/80 text-white rounded-none h-14 px-8 text-base font-bold tracking-wider uppercase transition-none">
                    {isLoading ? "Registering on Hedera..." : "Sign & Register Document"}
                  </Button>
                </div>
              </form>

              {/* Status Messages */}
              <div className="mt-8">
                {result?.error && (
                  <div className="border-2 border-black bg-white p-6">
                    <h3 className="font-bold text-black uppercase tracking-wider text-sm mb-2">Error</h3>
                    <p className="text-black">{result.error}</p>
                  </div>
                )}

                {result?.success && !result?.exists && (
                  <div className="border-2 border-black bg-black text-white p-6">
                    <h3 className="font-bold uppercase tracking-wider text-sm mb-4">Success! Document Registered</h3>
                    <div className="space-y-2 text-sm mb-6">
                      <div className="flex flex-col sm:flex-row sm:gap-2">
                        <span className="text-white/70">Hedera Sequence:</span> 
                        <span className="font-mono">{result.document.hederaSequence}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:gap-2">
                        <span className="text-white/70">Transaction Cost:</span> 
                        <span className="font-mono">{result.fee} HBAR</span>
                      </div>
                    </div>
                    <a href={`https://hashscan.io/testnet/topic/${result.document.topicId}?p=${result.document.hederaSequence}`} target="_blank" rel="noreferrer" className="inline-block font-bold text-black bg-white px-4 py-2 text-sm uppercase tracking-wider hover:bg-zinc-200 transition-none">
                      View Proof on Hashscan
                    </a>
                  </div>
                )}

                {result?.exists && (
                  <div className="border-2 border-black bg-white p-6">
                    <h3 className="font-bold text-black uppercase tracking-wider text-sm mb-4">Document Already Exists</h3>
                    <div className="space-y-2 text-sm text-black mb-6">
                      <div>This exact file was originally registered by: <strong className="font-bold">{result.document.issuer}</strong></div>
                      <div className="flex flex-col sm:flex-row sm:gap-2">
                        <span className="text-black/70">Topic Sequence:</span> 
                        <span className="font-mono font-bold">{result.document.hederaSequence}</span>
                      </div>
                    </div>
                    <a href={`https://hashscan.io/testnet/topic/${result.document.topicId}?p=${result.document.hederaSequence}`} target="_blank" rel="noreferrer" className="inline-block font-bold text-white bg-black px-4 py-2 text-sm uppercase tracking-wider hover:bg-black/80 transition-none">
                      View Original Proof
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}