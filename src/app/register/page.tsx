"use client";

import { useState, useEffect } from "react";
import { registerUser } from "../auth-actions";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  // State: Initialize with 0 to match server-side rendering initially
  const [captcha, setCaptcha] = useState({ num1: 0, num2: 0 });
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCaptcha({
        num1: Math.floor(Math.random() * 10),
        num2: Math.floor(Math.random() * 10)
      });
      setMounted(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);

    // Append the expected answer calculated from the state
    formData.append("expectedCaptcha", (captcha.num1 + captcha.num2).toString());

    const res = await registerUser(formData);
    setLoading(false);

    if (!res.success) {
      setMessage({ type: 'error', text: res.error || "Registration failed" });
      // Regenerate captcha on failure
      setCaptcha({
        num1: Math.floor(Math.random() * 10),
        num2: Math.floor(Math.random() * 10)
      });
    } else {
      setMessage({ type: 'success', text: res.message || "Account created successfully!" });
      // Redirect after success
      setTimeout(() => router.push("/"), 2000);
    }
  };

  // Prevent hydration mismatch: Don't render the form content until client-side logic is ready
  // We render a blank background matching the theme to prevent flashing
  if (!mounted) return <div className="min-h-screen bg-background transition-colors duration-300" />;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 transition-colors duration-300">

      <div className="w-full max-w-md bg-card text-card-foreground shadow-xl rounded-lg overflow-hidden border border-border transition-all duration-300">

        {/* Header matching the global theme */}
        <div className="bg-primary p-6">
          <h1 className="text-2xl font-bold text-primary-foreground text-center">Create Account</h1>
          <p className="text-primary-foreground/80 text-center text-sm font-medium mt-1">
            Join the Secure Access System
          </p>
        </div>

        <div className="p-8">

          {message && (
            <div className={`p-3 mb-6 rounded text-sm font-medium border ${message.type === 'success'
              ? "bg-dracula-green/20 text-dracula-green border-dracula-green/50"
              : "bg-destructive/20 text-destructive border-destructive/50"
              }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
              <input
                name="name"
                required
                className="w-full border border-input bg-background text-foreground p-2 rounded focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all placeholder:text-muted-foreground"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email</label>
              <input
                name="email"
                type="email"
                required
                className="w-full border border-input bg-background text-foreground p-2 rounded focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all placeholder:text-muted-foreground"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Password</label>
              <input
                name="password"
                type="password"
                required
                className="w-full border border-input bg-background text-foreground p-2 rounded focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all placeholder:text-muted-foreground"
                placeholder="********"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Must contain: 8+ chars, Uppercase, Lowercase, Number, Special char.
              </p>
            </div>

            {/* Captcha Section */}
            <div className="bg-muted/40 p-4 rounded-md border border-border">
              <label className="block text-sm font-bold text-foreground mb-2">
                Security Check: What is <span className="text-primary">{captcha.num1} + {captcha.num2}</span>?
              </label>
              <input
                name="captchaAnswer"
                required
                type="number"
                className="w-full border border-input bg-background text-foreground p-2 rounded focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                placeholder="Enter result"
              />
            </div>

            <button
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-bold p-3 rounded hover:bg-primary/90 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? "Creating Account..." : "Register"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/" className="text-primary font-medium hover:underline hover:text-primary/80 transition-colors">
              Login here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
