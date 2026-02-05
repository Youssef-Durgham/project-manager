"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.toLowerCase().trim(), password }),
      });
      const data = await res.json();

      if (data.success) {
        router.push("/");
        router.refresh();
      } else {
        setError("اسم المستخدم أو كلمة المرور خطأ");
      }
    } catch {
      setError("خطأ في الاتصال");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen gradient-mesh noise-bg flex items-center justify-center px-5">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-4xl mx-auto mb-4 shadow-xl shadow-indigo-500/20">
            📋
          </div>
          <h1 className="text-[24px] font-bold text-white tracking-tight">Project Manager</h1>
          <p className="text-[13px] text-slate-500 mt-1">Sign in to continue</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="glass-card rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full bg-slate-900/60 border border-slate-700/30 rounded-xl px-4 py-3 text-[14px] text-slate-200 placeholder-slate-600 input-focus"
              autoFocus
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-900/60 border border-slate-700/30 rounded-xl px-4 py-3 text-[14px] text-slate-200 placeholder-slate-600 input-focus"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5 text-[12px] text-rose-400 font-medium animate-scale-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 text-[14px] shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed press"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              "Sign In →"
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-700 mt-6">
          Project Manager · Secure Login
        </p>
      </div>
    </div>
  );
}
