'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';

interface UserItem {
  _id: string;
  username: string;
  name: string;
  role: 'admin' | 'member';
  isActive: boolean;
  lastLogin: string | null;
  lockedUntil?: string | null;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add form state
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'member'>('member');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'member'>('member');
  const [editPassword, setEditPassword] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/');
      return;
    }
    loadUsers();
  }, [user, router]);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch {}
    setLoading(false);
  };

  const handleAddUser = async () => {
    setError(''); setSuccess('');
    if (!newUsername || !newName || !newPassword) {
      setError('All fields are required — جميع الحقول مطلوبة');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, name: newName, password: newPassword, role: newRole }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('User created — تم إنشاء المستخدم');
        setNewUsername(''); setNewName(''); setNewPassword(''); setNewRole('member');
        setShowAddForm(false);
        await loadUsers();
      } else {
        setError(data.error || 'Failed to create user');
      }
    } catch {
      setError('Network error');
    }
    setSaving(false);
  };

  const handleEditUser = async () => {
    if (!editUser) return;
    setError(''); setSuccess('');
    setSaving(true);
    try {
      const body: any = { userId: editUser._id, name: editName, role: editRole, isActive: editActive };
      if (editPassword) body.password = editPassword;

      const res = await fetch('/api/auth/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('User updated — تم تحديث المستخدم');
        setEditUser(null);
        setEditPassword('');
        await loadUsers();
      } else {
        setError(data.error || 'Failed to update user');
      }
    } catch {
      setError('Network error');
    }
    setSaving(false);
  };

  const openEdit = (u: UserItem) => {
    setEditUser(u);
    setEditName(u.name);
    setEditRole(u.role);
    setEditActive(u.isActive);
    setEditPassword('');
    setError('');
    setSuccess('');
  };

  const getUserStatus = (u: UserItem) => {
    if (!u.isActive) return { label: 'Deactivated — معطل', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
    if (u.lockedUntil && new Date(u.lockedUntil) > new Date()) return { label: 'Locked — مقفل', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { label: 'Active — نشط', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🔒</div>
          <p className="text-slate-400">Admin access required — يتطلب صلاحيات المدير</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-mesh noise-bg">
      <div className="max-w-lg lg:max-w-4xl mx-auto px-5 lg:px-8 pt-5 pb-28">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <Link href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-200 transition-colors text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <h2 className="text-[17px] font-bold text-white">👥 Users — المستخدمين</h2>
          <div className="w-12" />
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 text-[12px] text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 animate-scale-in">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 text-[12px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 animate-scale-in">
            ✓ {success}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Users List */}
            <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 mb-6 stagger">
              {users.map(u => {
                const status = getUserStatus(u);
                return (
                  <div key={u._id} className="glass-card rounded-2xl p-4 group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-lg ${
                          u.role === 'admin'
                            ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20'
                            : 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-500/20'
                        }`}>
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-[14px] font-semibold text-white">{u.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-slate-500">@{u.username}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => openEdit(u)}
                        className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all font-medium border border-slate-700/30 press"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-600">
                      <span>{u.role === 'admin' ? '👑 Admin' : '👤 Member'}</span>
                      <span>Joined {new Date(u.createdAt).toLocaleDateString()}</span>
                      {u.lastLogin && <span>Last login {new Date(u.lastLogin).toLocaleDateString()}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add User Button / Form */}
            {showAddForm ? (
              <div className="glass-card rounded-2xl p-5 animate-scale-in">
                <h3 className="text-[14px] font-semibold text-white mb-4">➕ Add User — إضافة مستخدم</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Username — اسم المستخدم</label>
                    <input
                      type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)}
                      placeholder="e.g. employee-2"
                      className="w-full bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-2.5 text-[13px] text-white placeholder-slate-600 input-focus"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Name — الاسم</label>
                    <input
                      type="text" value={newName} onChange={e => setNewName(e.target.value)}
                      placeholder="Full name"
                      className="w-full bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-2.5 text-[13px] text-white placeholder-slate-600 input-focus"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Password — كلمة المرور</label>
                    <input
                      type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min 8 chars, upper+lower+number+special"
                      className="w-full bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-2.5 text-[13px] text-white placeholder-slate-600 input-focus"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Role — الصلاحية</label>
                    <div className="flex gap-2">
                      {(['member', 'admin'] as const).map(r => (
                        <button key={r} onClick={() => setNewRole(r)}
                          className={`flex-1 text-[12px] py-2.5 rounded-xl font-semibold transition-all ${
                            newRole === r
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-slate-800/40 text-slate-500 border border-slate-700/20'
                          }`}>
                          {r === 'admin' ? '👑 Admin' : '👤 Member'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={handleAddUser} disabled={saving}
                      className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-[12px] font-bold rounded-xl shadow-lg shadow-indigo-500/20 press transition-all">
                      {saving ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                          Saving...
                        </span>
                      ) : 'Create User — إنشاء'}
                    </button>
                    <button onClick={() => { setShowAddForm(false); setError(''); }}
                      className="px-4 py-3 text-[12px] text-slate-500 hover:text-slate-300 transition-colors font-medium">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={() => { setShowAddForm(true); setError(''); setSuccess(''); }}
                className="w-full py-3.5 text-[12px] font-semibold text-indigo-400 hover:text-indigo-300 border border-dashed border-indigo-500/30 hover:border-indigo-500/50 rounded-2xl transition-all press">
                + Add New User — إضافة مستخدم
              </button>
            )}
          </>
        )}

        {/* Edit Modal */}
        {editUser && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setEditUser(null)}>
            <div className="w-full max-w-lg bg-slate-900 border border-slate-700/50 rounded-t-3xl sm:rounded-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[16px] font-bold text-white">Edit User — تعديل المستخدم</h3>
                <button onClick={() => setEditUser(null)} className="text-slate-500 hover:text-slate-300 text-lg transition-colors">✕</button>
              </div>

              <div className="space-y-3">
                <div className="text-[12px] text-slate-500 mb-2">@{editUser.username}</div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Name — الاسم</label>
                  <input
                    type="text" value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-2.5 text-[13px] text-white input-focus"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Role — الصلاحية</label>
                  <div className="flex gap-2">
                    {(['member', 'admin'] as const).map(r => (
                      <button key={r} onClick={() => setEditRole(r)}
                        className={`flex-1 text-[12px] py-2.5 rounded-xl font-semibold transition-all ${
                          editRole === r
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-slate-800/40 text-slate-500 border border-slate-700/20'
                        }`}>
                        {r === 'admin' ? '👑 Admin' : '👤 Member'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Status — الحالة</label>
                  <div className="flex gap-2">
                    <button onClick={() => setEditActive(true)}
                      className={`flex-1 text-[12px] py-2.5 rounded-xl font-semibold transition-all ${
                        editActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800/40 text-slate-500 border border-slate-700/20'
                      }`}>
                      ✓ Active — نشط
                    </button>
                    <button onClick={() => setEditActive(false)}
                      className={`flex-1 text-[12px] py-2.5 rounded-xl font-semibold transition-all ${
                        !editActive ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800/40 text-slate-500 border border-slate-700/20'
                      }`}>
                      ✕ Deactivated — معطل
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Reset Password — إعادة تعيين</label>
                  <input
                    type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)}
                    placeholder="Leave empty to keep current"
                    className="w-full bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-2.5 text-[13px] text-white placeholder-slate-600 input-focus"
                  />
                </div>

                {editUser.lockedUntil && new Date(editUser.lockedUntil) > new Date() && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-[11px] text-amber-300">
                    🔒 Account is locked. Saving will unlock it.
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={handleEditUser} disabled={saving}
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-[12px] font-bold rounded-xl shadow-lg shadow-indigo-500/20 press transition-all">
                    {saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                        Saving...
                      </span>
                    ) : 'Save Changes — حفظ'}
                  </button>
                  <button onClick={() => setEditUser(null)}
                    className="px-4 py-3 text-[12px] text-slate-500 hover:text-slate-300 transition-colors font-medium">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
