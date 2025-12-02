'use client';
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Helper to pre-fill credentials
  const selectAuthType = (type: string) => {
    switch (type) {
      case "ADMIN":
        setEmail("admin@test.com");
        setPassword("password");
        break;
      case "MANAGER":
        setEmail("manager@test.com");
        setPassword("password");
        break;
      case "EMPLOYEE":
        setEmail("user@test.com");
        setPassword("password");
        break;
    }
    setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid credentials. Did you seed the DB?");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 transition-colors duration-300">

      {/* 
        Semantic Class Changes:
        - bg-card: Becomes White (Light) or Dracula Selection (Dark)
        - text-card-foreground: Becomes Black (Light) or White (Dark)
        - border-border: Becomes Light Gray (Light) or Dracula Comment (Dark)
      */}
      <div className="w-full max-w-md bg-card text-card-foreground shadow-xl rounded-lg overflow-hidden border border-border transition-colors duration-300">

        {/* Header */}
        <div className="bg-primary p-4">
          <h1 className="text-2xl font-bold text-primary-foreground text-center">Secure Access System</h1>
          <p className="text-primary-foreground/80 text-center text-sm font-medium">Select an Auth Persona below</p>
        </div>

        <div className="p-8">
          {/* Quick Select Buttons */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <button
              type="button"
              onClick={() => selectAuthType("ADMIN")}
              className="text-xs bg-dracula-purple/10 text-dracula-purple border border-dracula-purple/30 py-2 rounded hover:bg-dracula-purple/20 font-bold transition-colors"
            >
              Admin<br />(MAC/RBAC)
            </button>
            <button
              type="button"
              onClick={() => selectAuthType("MANAGER")}
              className="text-xs bg-dracula-pink/10 text-dracula-pink border border-dracula-pink/30 py-2 rounded hover:bg-dracula-pink/20 font-bold transition-colors"
            >
              Manager<br />(ABAC)
            </button>
            <button
              type="button"
              onClick={() => selectAuthType("EMPLOYEE")}
              className="text-xs bg-dracula-green/10 text-dracula-green border border-dracula-green/30 py-2 rounded hover:bg-dracula-green/20 font-bold transition-colors"
            >
              Employee<br />(DAC)
            </button>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink mx-4 text-muted-foreground text-xs">OR LOGIN MANUALLY</span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 mt-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-2 rounded text-center border border-destructive/20 font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email</label>
              {/* Input uses bg-background (creates contrast inside card) and text-foreground */}
              <input
                className="w-full border border-input bg-background text-foreground p-2 rounded focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all placeholder:text-muted-foreground"
                placeholder="user@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Password</label>
              <input
                className="w-full border border-input bg-background text-foreground p-2 rounded focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all placeholder:text-muted-foreground"
                type="password"
                placeholder="********"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-bold p-2 rounded hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Authenticating..." : "Login"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <a href="/api/seed" target="_blank" className="text-xs text-muted-foreground hover:text-primary transition-colors underline">
              Reset Database / Seed Users
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
