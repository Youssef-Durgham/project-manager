'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const getStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)) score++;
    return score; // 0-6
  };

  const strength = getStrength(newPassword);
  const strengthLabel = strength <= 2 ? 'Weak — ضعيفة' : strength <= 4 ? 'Medium — متوسطة' : 'Strong — قوية';
  const strengthColor = strength <= 2 ? 'bg-rose-500' : strength <= 4 ? 'bg-amber-500' : 'bg-emerald-500';
  const strengthTextColor = strength <= 2 ? 'text-rose-400' : strength <= 4 ? 'text-amber-400' : 'text-emerald-400';

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!currentPassword) { setError('Enter your current password'); return; }
    if (!newPassword) { setError('Enter a new password'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match — كلمات المرور غير متطابقة'); return; }
    if (strength <= 2) { setError('Password is too weak — كلمة المرور ضعيفة جداً'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Password changed successfully! — تم تغيير كلمة المرور');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch {
      setError('Network error');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen gradient-mesh noise-bg">
      <div className="max-w-lg lg:max-w-3xl mx-auto px-5 lg:px-8 pt-5 pb-28">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <Link href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-200 transition-colors text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <h2 className="text-[17px] font-bold text-white">⚙️ Settings — الإعدادات</h2>
          <div className="w-12" />
        </div>

        {/* User Info Card */}
        <div className="glass-card rounded-2xl p-5 mb-6 animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-indigo-500/20">
              {user?.name?.charAt(0) || '?'}
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-white">{user?.name}</h3>
              <p className="text-[12px] text-slate-500">@{user?.username} · {user?.role === 'admin' ? '👑 Admin' : '👤 Member'}</p>
            </div>
          </div>
        </div>

        {/* Change Password Section */}
        <div className="glass-card rounded-2xl p-5 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-[14px] font-semibold text-white mb-1">🔒 Change Password — تغيير كلمة المرور</h3>
          <p className="text-[11px] text-slate-500 mb-5">Secure your account with a strong password</p>

          <div className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Current Password — كلمة المرور الحالية
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-3 text-[14px] text-white placeholder-slate-600 input-focus pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showCurrent ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                New Password — كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars, upper, lower, number, special"
                  className="w-full bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-3 text-[14px] text-white placeholder-slate-600 input-focus pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showNew ? '🙈' : '👁️'}
                </button>
              </div>
              {/* Strength Indicator */}
              {newPassword && (
                <div className="mt-2 animate-fade-in">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColor : 'bg-slate-700/50'}`} />
                    ))}
                  </div>
                  <p className={`text-[10px] font-medium ${strengthTextColor}`}>{strengthLabel}</p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Confirm Password — تأكيد كلمة المرور
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-3 text-[14px] text-white placeholder-slate-600 input-focus"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[10px] text-rose-400 mt-1 animate-fade-in">Passwords don&apos;t match — غير متطابقة</p>
              )}
              {confirmPassword && newPassword === confirmPassword && confirmPassword.length > 0 && (
                <p className="text-[10px] text-emerald-400 mt-1 animate-fade-in">✓ Match — متطابقة</p>
              )}
            </div>

            {/* Requirements */}
            <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/20">
              <p className="text-[10px] font-semibold text-slate-400 mb-2">Password Requirements:</p>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { check: newPassword.length >= 8, label: '8+ characters' },
                  { check: /[A-Z]/.test(newPassword), label: 'Uppercase (A-Z)' },
                  { check: /[a-z]/.test(newPassword), label: 'Lowercase (a-z)' },
                  { check: /[0-9]/.test(newPassword), label: 'Number (0-9)' },
                  { check: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword), label: 'Special (!@#$)' },
                ].map(({ check, label }) => (
                  <span key={label} className={`text-[10px] ${check ? 'text-emerald-400' : 'text-slate-600'} transition-colors`}>
                    {check ? '✓' : '○'} {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-[12px] text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 animate-scale-in">
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="text-[12px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 animate-scale-in">
                ✓ {success}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={saving || !currentPassword || !newPassword || !confirmPassword}
              className={`w-full py-3.5 text-[13px] font-bold rounded-xl transition-all press ${
                currentPassword && newPassword && confirmPassword
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30'
                  : 'bg-slate-800/40 text-slate-700 border border-slate-700/20 cursor-not-allowed'
              } ${saving ? 'opacity-60' : ''}`}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Saving...
                </span>
              ) : 'Change Password — تغيير'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
