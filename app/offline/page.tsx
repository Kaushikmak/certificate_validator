export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-white text-black flex items-center justify-center p-8">
      <div className="border-2 border-black p-8 max-w-lg w-full text-center">
        <h1 className="text-2xl font-bold uppercase mb-3">You are offline</h1>
        <p className="text-sm">LedgerVerify is unavailable right now. Please reconnect and try again.</p>
      </div>
    </main>
  );
}
