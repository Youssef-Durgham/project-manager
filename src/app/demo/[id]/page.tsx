"use client";

import { useEffect, useState, use } from "react";
import { Project, Task, Component as ProjectComponent } from "@/lib/types";
import { getComponentTasks, getCompletionPercent, getTaskStats, getAllTasks } from "@/lib/utils";
import ProgressBar from "@/components/ProgressBar";
import StatusBadge from "@/components/StatusBadge";

export default function DemoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => r.json())
      .then(result => { setProject(result.data || result); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen gradient-mesh">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gradient-mesh">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-lg font-semibold text-slate-300">Project not found</h2>
      </div>
    );
  }

  const allTasks = getAllTasks(project);
  const overallPercent = getCompletionPercent(allTasks);
  const overallStats = getTaskStats(allTasks);
  const now = new Date();

  return (
    <div className="min-h-screen gradient-mesh noise-bg">
      <div className="max-w-2xl mx-auto px-5 pt-8 pb-20">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-[11px] text-indigo-400 font-semibold uppercase tracking-wider">Live Project Status</span>
          </div>
          <h1 className="text-[28px] font-bold text-white tracking-tight mb-2">{project.name}</h1>
          <p className="text-[14px] text-slate-400 max-w-lg mx-auto">{project.description}</p>
          <p className="text-[11px] text-slate-600 mt-2">Last updated: {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>

        {/* Tech Stack */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 animate-fade-in" style={{ animationDelay: '0.05s' }}>
          {(project.techStack || []).map(tech => (
            <span key={tech} className="text-[11px] px-3 py-1 rounded-lg bg-slate-800/60 text-slate-400 font-medium border border-slate-700/20">
              {tech}
            </span>
          ))}
        </div>

        {/* Overall Progress */}
        <div className="glass-card rounded-2xl p-6 mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[16px] font-bold text-slate-200">Overall Progress</h2>
            <span className={`text-[24px] font-bold ${overallPercent >= 80 ? 'text-emerald-400' : overallPercent >= 50 ? 'text-blue-400' : 'text-amber-400'}`}>
              {overallPercent}%
            </span>
          </div>
          <ProgressBar value={overallPercent} size="lg" animated />
          <div className="grid grid-cols-4 gap-4 mt-5">
            {[
              { label: "Completed", value: overallStats.done, total: allTasks.length, color: "text-emerald-400", icon: "✅" },
              { label: "In Progress", value: overallStats.inProgress, total: null, color: "text-violet-400", icon: "🔄" },
              { label: "In Review", value: overallStats.review, total: null, color: "text-orange-400", icon: "👁️" },
              { label: "Remaining", value: allTasks.length - overallStats.done, total: null, color: "text-slate-400", icon: "📋" },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className="text-xl mb-1">{item.icon}</div>
                <div className={`text-[18px] font-bold ${item.color}`}>
                  {item.value}{item.total !== null ? `/${item.total}` : ''}
                </div>
                <div className="text-[10px] text-slate-600 font-medium">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Components */}
        <div className="space-y-4">
          {(project.components || []).map((comp, i) => {
            const compTasks = getComponentTasks(comp);
            const compPercent = getCompletionPercent(compTasks);
            const compStats = getTaskStats(compTasks);

            return (
              <div key={comp.id} className="glass-card rounded-2xl p-5 animate-fade-in" style={{ animationDelay: `${0.15 + i * 0.05}s` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/30 flex items-center justify-center text-xl">
                    {comp.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[15px] font-semibold text-slate-200">{comp.name}</h3>
                    <p className="text-[11px] text-slate-500">{compStats.done}/{compTasks.length} tasks complete</p>
                  </div>
                  <span className={`text-[16px] font-bold ${compPercent >= 80 ? 'text-emerald-400' : compPercent >= 50 ? 'text-blue-400' : 'text-slate-500'}`}>
                    {compPercent}%
                  </span>
                </div>
                <ProgressBar value={compPercent} size="md" animated />

                {/* Phases */}
                <div className="mt-4 space-y-3">
                  {(comp.phases || []).map(phase => {
                    const phasePercent = getCompletionPercent(phase.tasks);
                    return (
                      <div key={phase.id} className="bg-slate-900/30 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-[13px] font-medium text-slate-300">{phase.name}</h4>
                          <span className="text-[11px] text-slate-500">{phasePercent}%</span>
                        </div>
                        <ProgressBar value={phasePercent} size="sm" />
                        <div className="mt-2 space-y-1">
                          {(phase.tasks || []).map(task => (
                            <div key={task.id} className="flex items-center gap-2 py-1">
                              {(task.status === 'done' || task.status === 'approved') ? (
                                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                                  task.status === 'in-progress' ? 'border-violet-400' :
                                  task.status === 'review' ? 'border-orange-400' :
                                  task.status === 'ready' ? 'border-blue-400' : 'border-slate-600'
                                }`} />
                              )}
                              <span className={`text-[12px] flex-1 ${(task.status === 'done' || task.status === 'approved') ? 'text-slate-600 line-through' : 'text-slate-400'}`}>
                                {task.title}
                              </span>
                              <StatusBadge status={task.status} size="sm" />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-[11px] text-slate-700">
          <p>Powered by Project Manager</p>
          <p className="mt-1">Real-time project tracking</p>
        </div>
      </div>
    </div>
  );
}
