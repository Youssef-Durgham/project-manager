'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Project, TYPE_LABELS, STATUS_CONFIG } from '@/lib/types';
import ProgressBar from '@/components/ProgressBar';
import { useAuth } from '@/lib/AuthContext';
import NotificationPanel from '@/components/NotificationPanel';

export default function Home() {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setProjects(data.data);
      } else {
        await fetch('/api/seed', { method: 'POST' });
        const res2 = await fetch('/api/projects');
        const data2 = await res2.json();
        if (data2.success) setProjects(data2.data);
      }
    } catch {
      try {
        await fetch('/api/seed', { method: 'POST' });
        const res = await fetch('/api/projects');
        const data = await res.json();
        if (data.success) setProjects(data.data);
      } catch (e) {
        console.error('Failed to load', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStats = (project: Project) => {
    let total = 0, done = 0, ready = 0, inProgress = 0, phases = 0, comps = project.components?.length || 0;
    project.components?.forEach(c => {
      c.phases?.forEach(p => {
        phases++;
        p.tasks?.forEach(t => {
          total++;
          if (t.status === 'done') done++;
          if (t.status === 'ready') ready++;
          if (t.status === 'in-progress') inProgress++;
        });
      });
    });
    return { total, done, ready, inProgress, phases, comps, progress: total > 0 ? Math.round((done / total) * 100) : 0 };
  };

  const active = projects.filter(p => p.status === 'active').length;
  const completed = projects.filter(p => p.status === 'completed').length;
  const totalTasks = projects.reduce((sum, p) => {
    let t = 0;
    p.components?.forEach(c => c.phases?.forEach(ph => { t += ph.tasks?.length || 0; }));
    return sum + t;
  }, 0);
  const doneTasks = projects.reduce((sum, p) => {
    let t = 0;
    p.components?.forEach(c => c.phases?.forEach(ph => ph.tasks?.forEach(tk => { if (tk.status === 'done') t++; })));
    return sum + t;
  }, 0);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center gradient-mesh">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading projects...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-28 gradient-mesh noise-bg">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-8 pb-2 animate-fade-in">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-white">Projects</h1>
            <p className="text-slate-500 text-[13px] mt-0.5">Yusif & Employee-1 🔩</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <Link href="/search" className="w-9 h-9 rounded-xl bg-slate-800/60 border border-slate-700/30 hover:bg-slate-700/60 flex items-center justify-center transition-all press">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>

            {/* Notifications */}
            <NotificationPanel />

            {/* Settings */}
            <Link href="/settings" className="w-9 h-9 rounded-xl bg-slate-800/60 border border-slate-700/30 hover:bg-slate-700/60 flex items-center justify-center transition-all press">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>

            {/* Admin Users (admin only) */}
            {user?.role === 'admin' && (
              <Link href="/admin/users" className="w-9 h-9 rounded-xl bg-slate-800/60 border border-slate-700/30 hover:bg-slate-700/60 flex items-center justify-center transition-all press">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </Link>
            )}

            {/* User avatar / logout */}
            <button onClick={logout} className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/30 hover:bg-slate-700/60 transition-all group">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white text-[11px] shadow-lg shadow-indigo-500/20">
                {user?.username === 'yusif' ? 'Y' : '🔩'}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="max-w-7xl mx-auto px-5 lg:px-8 mt-4 mb-6 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="glass-card rounded-2xl p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{active}</div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">Active</div>
            </div>
            <div className="text-center border-x border-slate-700/30">
              <div className="text-2xl font-bold text-white">{completed}</div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">Done</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{doneTasks}<span className="text-slate-600 text-lg">/{totalTasks}</span></div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">Tasks</div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Cards */}
      <div className="max-w-7xl mx-auto px-5 lg:px-8 stagger grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map(project => {
          const s = getStats(project);
          const typeInfo = TYPE_LABELS[project.type];
          
          return (
            <Link href={`/project/${project.slug || project._id}`} key={project._id || project.slug}>
              <div className="glass-card card-hover rounded-2xl p-5 press group">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[17px] font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
                      {project.name}
                    </h3>
                    <p className="text-slate-500 text-[13px] mt-1 line-clamp-1">{project.description}</p>
                  </div>
                  <span className={`
                    ml-3 flex-shrink-0 text-[10px] px-2 py-[3px] rounded-md border font-medium
                    ${project.type === 'fullstack' ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' :
                      project.type === 'web' ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' :
                      project.type === 'mobile' ? 'bg-rose-500/10 text-rose-300 border-rose-500/20' :
                      'bg-amber-500/10 text-amber-300 border-amber-500/20'}
                  `}>
                    {typeInfo.icon} {typeInfo.label}
                  </span>
                </div>
                
                {/* Tech Stack */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {project.techStack?.slice(0, 5).map(tech => (
                    <span key={tech} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 font-medium border border-slate-700/30">
                      {tech}
                    </span>
                  ))}
                  {(project.techStack?.length || 0) > 5 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-600">
                      +{project.techStack!.length - 5}
                    </span>
                  )}
                </div>
                
                {/* Progress */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">Progress</span>
                    <span className={`text-[11px] font-bold ${s.progress >= 80 ? 'text-emerald-400' : s.progress >= 50 ? 'text-blue-400' : 'text-amber-400'}`}>
                      {s.progress}%
                    </span>
                  </div>
                  <ProgressBar value={s.progress} size="md" />
                </div>
                
                {/* Bottom Stats */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      {s.comps} comp{s.comps !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      {s.phases} phase{s.phases !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-500" />
                      {s.done}/{s.total}
                    </span>
                  </div>

                  {(s.ready > 0 || s.inProgress > 0) && (
                    <div className="flex gap-1.5">
                      {s.inProgress > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">
                          {s.inProgress} active
                        </span>
                      )}
                      {s.ready > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                          {s.ready} ready
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}

        {projects.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 animate-float">📂</div>
            <p className="text-slate-400 font-medium">No projects yet</p>
            <p className="text-slate-600 text-sm mt-1">Create your first project to get started</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <Link
        href="/project/new"
        className="fixed bottom-7 right-5 lg:right-8 lg:bottom-8 w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/25 press z-50 group"
      >
        <svg className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </Link>
    </main>
  );
}
