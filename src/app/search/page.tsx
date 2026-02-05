'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/lib/types';

interface SearchResult {
  projects: any[];
  tasks: any[];
  comments: any[];
}

const STATUS_OPTIONS = ['ready', 'waiting', 'in-progress', 'review', 'revision', 'approved', 'done'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical'];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'tasks' | 'projects' | 'comments'>('all');
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
      }
    } catch {
      console.error('Search failed');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  // Filter tasks
  const filteredTasks = results?.tasks?.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (assigneeFilter && t.assignee !== assigneeFilter) return false;
    return true;
  }) || [];

  const totalResults = (results?.projects?.length || 0) + filteredTasks.length + (results?.comments?.length || 0);

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
          <h2 className="text-[17px] font-bold text-white">🔍 Search — بحث</h2>
          <div className="w-12" />
        </div>

        {/* Search Input */}
        <div className="mb-4 animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search tasks, projects, comments..."
              className="w-full bg-slate-800/40 border border-slate-700/30 rounded-2xl pl-12 pr-12 py-4 text-[15px] text-white placeholder-slate-600 input-focus"
              autoFocus
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults(null); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filters Toggle */}
        <div className="mb-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters — فلاتر
            {(statusFilter || priorityFilter || assigneeFilter) && (
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse-ring" />
            )}
          </button>

          {showFilters && (
            <div className="mt-3 glass-card rounded-xl p-4 space-y-3 animate-scale-in">
              {/* Status Filter */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setStatusFilter('')}
                    className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition-all ${!statusFilter ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800/40 text-slate-500 border border-slate-700/20'}`}>
                    All
                  </button>
                  {STATUS_OPTIONS.map(s => (
                    <button key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition-all ${statusFilter === s ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800/40 text-slate-500 border border-slate-700/20'}`}>
                      {STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.icon} {STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Priority — الأولوية</label>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setPriorityFilter('')}
                    className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition-all ${!priorityFilter ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800/40 text-slate-500 border border-slate-700/20'}`}>
                    All
                  </button>
                  {PRIORITY_OPTIONS.map(p => (
                    <button key={p} onClick={() => setPriorityFilter(priorityFilter === p ? '' : p)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition-all ${priorityFilter === p ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800/40 text-slate-500 border border-slate-700/20'}`}>
                      {PRIORITY_CONFIG[p as keyof typeof PRIORITY_CONFIG]?.icon} {PRIORITY_CONFIG[p as keyof typeof PRIORITY_CONFIG]?.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assignee Filter */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Assignee — المسؤول</label>
                <div className="flex flex-wrap gap-1.5">
                  {['', 'yusif', 'employee-1'].map(a => (
                    <button key={a || 'all'} onClick={() => setAssigneeFilter(a)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition-all ${assigneeFilter === a ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800/40 text-slate-500 border border-slate-700/20'}`}>
                      {a === '' ? 'All' : a === 'yusif' ? '👑 Yusif' : '🔩 Employee-1'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              {(statusFilter || priorityFilter || assigneeFilter) && (
                <button onClick={() => { setStatusFilter(''); setPriorityFilter(''); setAssigneeFilter(''); }}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-medium transition-colors">
                  ✕ Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Results */}
        {results && !loading && (
          <div className="animate-fade-in">
            {/* Result Count */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] text-slate-500 font-medium">
                {totalResults} result{totalResults !== 1 ? 's' : ''} — {totalResults} نتيجة
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-slate-800/30 rounded-xl p-1">
              {[
                { id: 'all', label: 'All', count: totalResults },
                { id: 'tasks', label: 'Tasks', count: filteredTasks.length },
                { id: 'projects', label: 'Projects', count: results.projects?.length || 0 },
                { id: 'comments', label: 'Comments', count: results.comments?.length || 0 },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 text-[11px] font-semibold py-2 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-slate-700/60 text-white'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab.label} {tab.count > 0 && <span className="text-slate-600">({tab.count})</span>}
                </button>
              ))}
            </div>

            {/* Projects Results */}
            {(activeTab === 'all' || activeTab === 'projects') && results.projects?.length > 0 && (
              <div className="mb-6">
                {activeTab === 'all' && (
                  <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">📁 Projects — المشاريع</h3>
                )}
                <div className="space-y-2 stagger">
                  {results.projects.map((p: any) => (
                    <Link key={p._id} href={`/project/${p.slug || p._id}`}>
                      <div className="glass-card rounded-xl px-4 py-3 card-hover press group">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">📁</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[13px] font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors truncate">{p.name}</h4>
                            <p className="text-[10px] text-slate-500">{p.type}</p>
                          </div>
                          <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks Results */}
            {(activeTab === 'all' || activeTab === 'tasks') && filteredTasks.length > 0 && (
              <div className="mb-6">
                {activeTab === 'all' && (
                  <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">✅ Tasks — المهام</h3>
                )}
                <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 stagger">
                  {filteredTasks.map((t: any, i: number) => (
                    <Link key={`${t.projectSlug}-${t.taskId}-${i}`} href={`/project/${t.projectSlug}?task=${t.taskId}`}>
                      <div className="glass-card rounded-xl px-4 py-3 card-hover press group">
                        <div className="flex items-start gap-3">
                          <span className="text-sm mt-0.5">{STATUS_CONFIG[t.status as keyof typeof STATUS_CONFIG]?.icon || '📋'}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[13px] font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors truncate">{t.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-600">{t.projectName}</span>
                              <span className="text-slate-700">·</span>
                              <span className="text-[10px] text-slate-600">{t.componentName}</span>
                              <span className="text-slate-700">·</span>
                              <span className="text-[10px] text-slate-600">{t.phaseName}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium border ${
                              t.priority === 'critical' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                              t.priority === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                              t.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                              {PRIORITY_CONFIG[t.priority as keyof typeof PRIORITY_CONFIG]?.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Comments Results */}
            {(activeTab === 'all' || activeTab === 'comments') && results.comments?.length > 0 && (
              <div className="mb-6">
                {activeTab === 'all' && (
                  <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">💬 Comments — التعليقات</h3>
                )}
                <div className="space-y-2 stagger">
                  {results.comments.map((c: any) => (
                    <div key={c._id} className="glass-card rounded-xl px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span className="text-sm mt-0.5">💬</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-slate-300 line-clamp-2">{c.text}</p>
                          <p className="text-[10px] text-slate-600 mt-1">by {c.author} · {new Date(c.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No results */}
            {totalResults === 0 && (
              <div className="text-center py-16">
                <div className="text-4xl mb-3 animate-float">🔍</div>
                <p className="text-slate-400 font-medium text-sm">No results found — لا توجد نتائج</p>
                <p className="text-slate-600 text-[12px] mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!results && !loading && !query && (
          <div className="text-center py-16 animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <div className="text-5xl mb-4 animate-float">🔍</div>
            <p className="text-slate-400 font-medium">Search across everything</p>
            <p className="text-slate-600 text-[12px] mt-1">Tasks, projects, comments — ابحث في كل شيء</p>
          </div>
        )}
      </div>
    </div>
  );
}
