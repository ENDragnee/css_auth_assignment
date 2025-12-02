"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { generateMfaSecret, enableMfa, updateProfile } from "../auth-actions";
import QRCode from "qrcode";
import Link from "next/link";
import Image from "next/image";

// Define local interface to fix 'any' type on session.user
interface UserWithSecurity {
  name?: string | null;
  email?: string | null;
  isMfaEnabled: boolean;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [qrUrl, setQrUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Biometric Stub
  const handleBiometric = async () => {
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      setMsg({ type: 'success', text: "Biometric request initiated (Simulation). In real app, this sends FIDO2 challenge." });
    } else {
      setMsg({ type: 'error', text: "Biometrics not supported on this device." });
    }
  };

  const handleSetupMFA = async () => {
    const user = session?.user as UserWithSecurity;
    if (!user?.email) return;

    try {
      const res = await generateMfaSecret();
      setSecret(res.secret);

      const otpauth = `otpauth://totp/SecureApp:${res.email}?secret=${res.secret}&issuer=SecureApp`;
      const url = await QRCode.toDataURL(otpauth);
      setQrUrl(url);
      setMsg(null);
    } catch (error) {
      console.error(error);
      setMsg({ type: 'error', text: "Failed to generate MFA setup." });
    }
  };

  const verifyMFA = async () => {
    const res = await enableMfa(secret, token);
    if (res.success) {
      setMsg({ type: 'success', text: "MFA Enabled Successfully! You will need it next login." });
      setQrUrl(""); // Hide QR code on success
    } else {
      setMsg({ type: 'error', text: "Invalid Code. Try again." });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const res = await updateProfile(formData);

    setMsg({
      type: res.success ? 'success' : 'error',
      text: res.message || res.error || "Unknown Error"
    });
  };

  if (!session || !session.user) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-foreground">Loading...</div>;
  }

  // Cast user to our typed interface
  const user = session.user as UserWithSecurity;

  return (
    <div className="min-h-screen p-8 bg-background text-foreground transition-colors duration-300">
      <Link href="/dashboard" className="text-primary hover:underline mb-6 inline-block font-medium">
        ← Back to Dashboard
      </Link>

      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your security settings and preferences.</p>
        </div>

        {msg && (
          <div className={`p-4 rounded-md border text-sm font-medium ${msg.type === 'success'
            ? "bg-dracula-green/20 text-dracula-green border-dracula-green/50"
            : "bg-destructive/20 text-destructive border-destructive/50"
            }`}>
            {msg.text}
          </div>
        )}

        {/* 1. Profile Details Form */}
        <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md border border-border">
          <h2 className="text-xl font-bold mb-4 text-primary border-b border-border pb-2">Update Details</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input
                name="name"
                defaultValue={user.name || ""}
                className="w-full border border-input bg-background text-foreground p-2 rounded focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">New Password</label>
              <input
                name="password"
                type="password"
                placeholder="Leave blank to keep current"
                className="w-full border border-input bg-background text-foreground p-2 rounded focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
              />
              <p className="text-xs text-muted-foreground mt-1">Must contain 8+ chars, uppercase, number, special char.</p>
            </div>
            <button className="bg-primary text-primary-foreground font-bold px-4 py-2 rounded hover:bg-primary/90 transition-all">
              Save Changes
            </button>
          </form>
        </div>

        {/* 2. MFA Section */}
        <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md border border-border">
          <h2 className="text-xl font-bold mb-4 text-primary border-b border-border pb-2">Multi-Factor Authentication</h2>

          {user.isMfaEnabled ? (
            <div className="flex items-center gap-3 bg-dracula-green/10 border border-dracula-green/30 p-4 rounded text-dracula-green">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span className="font-bold">MFA is currently active on your account.</span>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-sm text-muted-foreground">
                Enhance your account security by enabling Two-Factor Authentication using Google Authenticator or Authy.
              </p>

              {!qrUrl ? (
                <button onClick={handleSetupMFA} className="bg-secondary text-secondary-foreground border border-border font-bold px-4 py-2 rounded hover:bg-secondary/80 transition-all">
                  Setup MFA
                </button>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex flex-col items-center p-4 bg-white rounded-lg w-fit mx-auto border border-gray-200">
                    <Image
                      src={qrUrl}
                      alt="MFA QR Code"
                      width={180}
                      height={180}
                      className="rounded"
                    />
                    <p className="text-xs text-gray-500 mt-2 font-mono break-all max-w-[200px] text-center">
                      Secret: {secret}
                    </p>
                  </div>

                  <div className="flex gap-2 max-w-sm mx-auto">
                    <input
                      value={token}
                      onChange={e => setToken(e.target.value)}
                      placeholder="Enter 6-digit code"
                      className="flex-1 border border-input bg-background text-foreground p-2 rounded focus:ring-2 focus:ring-ring outline-none"
                    />
                    <button onClick={verifyMFA} className="bg-dracula-green text-white font-bold px-4 py-2 rounded hover:bg-green-600 transition-all">
                      Verify
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Biometric Section */}
        <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md border border-border">
          <h2 className="text-xl font-bold mb-4 text-primary border-b border-border pb-2">Biometric Authentication</h2>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Passkeys / WebAuthn</p>
              <p className="text-xs text-muted-foreground">Login faster using your device&apos;s Fingerprint or FaceID.</p>
            </div>
            <button
              onClick={handleBiometric}
              className="bg-accent text-accent-foreground border border-border px-4 py-2 rounded hover:bg-accent/80 transition-all whitespace-nowrap"
            >
              Register Device
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
