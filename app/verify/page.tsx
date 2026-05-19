// app/verify/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function VerifyPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ verified: false, message: "Server error occurred during verification." });
    } finally {
      setIsLoading(false);
    }
  };

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
      <div className="flex-1 flex flex-col items-center p-4 sm:p-12 relative">
        
        {/* Strict Black & White Form Container */}
        <div className="w-full max-w-4xl border-2 border-black bg-white mt-4 sm:mt-8">
          
          <div className="border-b-2 border-black p-8 sm:p-10">
            <h1 className="text-3xl font-bold tracking-tight text-black mb-2">
              Verify Document
            </h1>
            <p className="text-black/70 text-base">
              Upload a document to check its authenticity against the Hedera ledger.
            </p>
          </div>
          
          <div className="p-8 sm:p-10">
            <form onSubmit={handleVerify} className="space-y-8">
              <div className="space-y-3">
                <Label htmlFor="file" className="text-black font-bold uppercase tracking-wider text-xs">
                  Upload PDF to Verify *
                </Label>
                <div className="flex items-center">
                  <Input
                    id="file"
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    required
                    className="bg-white border-black border-2 text-black file:text-black file:bg-white file:border file:border-black file:px-4 file:py-1 file:rounded-none file:font-bold file:mr-4 cursor-pointer hover:file:bg-black hover:file:text-white transition-colors h-14 pt-2.5 rounded-none"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  disabled={isLoading || !file} 
                  className="w-full bg-black hover:bg-black/80 text-white rounded-none h-14 px-8 text-base font-bold tracking-wider uppercase transition-none disabled:bg-zinc-300 disabled:text-zinc-500"
                >
                  {isLoading ? "Analyzing Cryptographic Hash..." : "Verify Document"}
                </Button>
              </div>
            </form>

            {/* Stark Monochromatic Result Displays */}
            {result && result.verified === false && (
              <div className="mt-8 border-2 border-black bg-white p-6">
                <h3 className="font-bold text-black uppercase tracking-wider text-sm mb-2">Verification Failed</h3>
                <p className="text-black">{result.message}</p>
              </div>
            )}

            {result && result.verified === true && (
              <div className="mt-8 border-2 border-black bg-white">
                <div className="bg-black text-white p-4 border-b-2 border-black">
                  <h3 className="font-bold uppercase tracking-wider text-sm">Authentic Document</h3>
                </div>
                <div className="p-6 space-y-4 text-sm text-black">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-black/20 pb-4">
                    <span className="font-bold uppercase tracking-wider text-xs text-black/60">Title:</span>
                    <span className="sm:col-span-2 font-medium">{result.documentDetails.title}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-black/20 pb-4">
                    <span className="font-bold uppercase tracking-wider text-xs text-black/60">Issuer:</span>
                    <span className="sm:col-span-2">{result.documentDetails.issuer}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-black/20 pb-4">
                    <span className="font-bold uppercase tracking-wider text-xs text-black/60">Type:</span>
                    <span className="sm:col-span-2 uppercase">{result.documentDetails.documentType}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-black/20 pb-4">
                    <span className="font-bold uppercase tracking-wider text-xs text-black/60">Timestamp:</span>
                    <span className="sm:col-span-2">{new Date(result.documentDetails.timestamp).toLocaleString()}</span>
                  </div>
                  {result.documentDetails.expiresAt && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-black/20 pb-4">
                      <span className="font-bold uppercase tracking-wider text-xs text-black/60">Expires:</span>
                      <span className="sm:col-span-2">{new Date(result.documentDetails.expiresAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <span className="font-bold uppercase tracking-wider text-xs text-black/60">Hedera Seq:</span>
                    <span className="sm:col-span-2 font-mono font-bold">{result.documentDetails.sequence}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
