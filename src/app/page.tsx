'use client';
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState(""); // State for 2nd Factor
  const [showMfaInput, setShowMfaInput] = useState(false); // Toggle UI
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Helper for Demo Personas
  const selectAuthType = (type: string) => {
    switch (type) {
      case "ADMIN": setEmail("admin@test.com"); setPassword("password"); break;
      case "MANAGER": setEmail("manager@test.com"); setPassword("password"); break;
      case "EMPLOYEE": setEmail("user@test.com"); setPassword("password"); break;
    }
    setError(""); setShowMfaInput(false); setMfaCode("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      mfaCode: showMfaInput ? mfaCode : undefined, // Only send if asked
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      if (res.error === "MFA_REQUIRED") {
        setShowMfaInput(true);
        setError("Please enter the code from your Authenticator App.");
      } else {
        setError(res.error); // Handles Lockout messages too
      }
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-card text-card-foreground shadow-xl rounded-lg overflow-hidden border border-border transition-colors duration-300">

        <div className="bg-primary p-4">
          <h1 className="text-2xl font-bold text-primary-foreground text-center">Secure Access System</h1>
          <p className="text-primary-foreground/80 text-center text-sm font-medium">Authentication & MFA Demo</p>
        </div>

        <div className="p-8">
          {/* Quick Select Buttons (Only show if not in MFA mode) */}
          {!showMfaInput && (
            <div className="grid grid-cols-3 gap-2 mb-6">
              <button type="button" onClick={() => selectAuthType("ADMIN")} className="text-xs bg-dracula-purple/10 text-dracula-purple border border-dracula-purple/30 py-2 rounded font-bold">Admin</button>
              <button type="button" onClick={() => selectAuthType("MANAGER")} className="text-xs bg-dracula-pink/10 text-dracula-pink border border-dracula-pink/30 py-2 rounded font-bold">Manager</button>
              <button type="button" onClick={() => selectAuthType("EMPLOYEE")} className="text-xs bg-dracula-green/10 text-dracula-green border border-dracula-green/30 py-2 rounded font-bold">Employee</button>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 mt-4">
            {error && <div className="bg-destructive/10 text-destructive text-sm p-2 rounded text-center border border-destructive/20 font-medium">{error}</div>}

            {!showMfaInput ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                  <input className="w-full border border-input bg-background text-foreground p-2 rounded" placeholder="user@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Password</label>
                  <input className="w-full border border-input bg-background text-foreground p-2 rounded" type="password" placeholder="********" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
              </>
            ) : (
              <div className="animate-in fade-in slide-in-from-right duration-300">
                <label className="block text-sm font-bold text-primary mb-1">Two-Factor Authentication Code</label>
                <input
                  className="w-full text-center tracking-widest text-xl border border-primary bg-background text-foreground p-2 rounded"
                  placeholder="123456"
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value)}
                  autoFocus
                  required
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">Open your Google Authenticator app</p>
              </div>
            )}

            <button disabled={loading} className="w-full bg-primary text-primary-foreground font-bold p-2 rounded hover:bg-primary/90 transition">
              {loading ? "Checking..." : (showMfaInput ? "Verify Code" : "Login")}
            </button>
          </form>

          <div className="mt-4 flex justify-between text-xs">
            <Link href="/register" className="text-primary hover:underline">Create Account</Link>
            <a href="/api/seed" target="_blank" className="text-muted-foreground hover:text-primary underline">Reset DB</a>
          </div>
        </div>
      </div>
    </div>
  );
}
