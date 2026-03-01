"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = "login" | "signup";

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

  if (!isOpen) return null;

  function reset() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setError("");
    setStatus("idle");
  }

  function switchMode(m: Mode) {
    setMode(m);
    setError("");
    setStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("submitting");

    const err =
      mode === "login"
        ? await login(email, password)
        : await signup(firstName, lastName, email, password);

    if (err) {
      setError(err);
      setStatus("idle");
      return;
    }

    setStatus("success");
    reset();
    setTimeout(onClose, 800);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />

      <div className="glass-panel relative w-full max-w-md rounded-[24px] p-6 animate-slide-up">
        <button onClick={onClose} className="absolute top-3 right-3 glass-icon-btn">
          <X className="w-5 h-5" />
        </button>

        {status === "success" ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">&#10003;</div>
            <p className="text-green-300/80 font-medium">
              {mode === "login" ? "Welcome back!" : "Account created!"}
            </p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-5 glass-panel rounded-full p-0.5 w-fit">
              <button
                onClick={() => switchMode("login")}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                  mode === "login"
                    ? "bg-white/[0.18] text-white"
                    : "text-white/50 hover:text-white/75"
                )}
              >
                Sign In
              </button>
              <button
                onClick={() => switchMode("signup")}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                  mode === "signup"
                    ? "bg-white/[0.18] text-white"
                    : "text-white/50 hover:text-white/75"
                )}
              >
                Create Account
              </button>
            </div>

            {mode === "signup" && (
              <p className="text-xs text-white/45 mb-4 leading-relaxed">
                Create an account to save your favorite bars to show up on the map
                initially, or quickly find them and see information about them.
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signup" && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-white/40 mb-1.5">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="glass-input text-sm w-full"
                      placeholder="Jane"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-white/40 mb-1.5">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="glass-input text-sm w-full"
                      placeholder="Doe"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-white/40 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="glass-input text-sm w-full"
                  placeholder="jane@example.com"
                />
              </div>

              <div>
                <label className="block text-xs text-white/40 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="glass-input text-sm w-full"
                  placeholder={mode === "signup" ? "At least 6 characters" : ""}
                />
              </div>

              {error && <p className="text-red-300/80 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={status === "submitting"}
                className={cn(
                  "w-full py-2.5 rounded-full text-sm font-medium transition-all border",
                  status === "submitting"
                    ? "bg-white/[0.06] border-white/[0.06] text-white/30 cursor-wait"
                    : "bg-white/[0.12] border-white/[0.15] text-white/85 hover:bg-white/[0.18] hover:border-white/[0.22]"
                )}
              >
                {status === "submitting"
                  ? "..."
                  : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
