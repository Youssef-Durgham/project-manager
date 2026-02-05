"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { Project, Task, STATUS_CONFIG } from "@/lib/types";
import { getAllTasks } from "@/lib/utils";
import TaskDetail from "@/components/TaskDetail";

interface TimeEntry {
  task: Task;
  componentName: string;
  phaseName: string;
  estimatedHours: number;
  actualHours: number;
  timerHours: number;
  accuracy: number; // percentage
}

interface GroupBreakdown {
  name: string;
  estimated: number;
  actual: number;
  timerHours: number;
  taskCount: number;
  doneCount: number;
}

export default function TimeTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "assignees" | "components" | "phases" | "timer">("overview");

  const loadProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      const data = await res.json();
      setProject(data.data || data);
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => { loadProject(); }, [loadProject]);

  const allTasks = project ? getAllTasks(project) : [];

  // Build enriched task data with component/phase info
  const buildTimeEntries = (): TimeEntry[] => {
    if (!project) return [];
    const entries: TimeEntry[] = [];
    for (const comp of project.components || []) {
      for (const phase of comp.phases || []) {
        for (const task of phase.tasks || []) {
          const est = task.estimatedHours || 0;
          const actual = task.actualHours || 0;
          const timer = (task.totalTimerSeconds || 0) / 3600;
          const effectiveActual = actual || timer;
          const accuracy = est > 0 && effectiveActual > 0 ? Math.round((Math.min(est, effectiveActual) / Math.max(est, effectiveActual)) * 100) : 0;
          entries.push({
            task,
            componentName: comp.name,
            phaseName: phase.name,
            estimatedHours: est,
            actualHours: actual,
            timerHours: timer,
            accuracy,
          });
        }
      }
    }
    return entries;
  };

  const entries = buildTimeEntries();
  const totalEstimated = entries.reduce((s, e) => s + e.estimatedHours, 0);
  const totalActual = entries.reduce((s, e) => s + e.actualHours, 0);
  const totalTimer = entries.reduce((s, e) => s + e.timerHours, 0);
  const effectiveTotal = totalActual || totalTimer;
  const overallAccuracy = totalEstimated > 0 && effectiveTotal > 0 
    ? Math.round((Math.min(totalEstimated, effectiveTotal) / Math.max(totalEstimated, effectiveTotal)) * 100) 
    : 0;
  const overEstimated = effectiveTotal > 0 ? totalEstimated > effectiveTotal : false;

  // Group by assignee
  const byAssignee = (): GroupBreakdown[] => {
    const map = new Map<string, GroupBreakdown>();
    entries.forEach(e => {
      const key = e.task.assignee || "Unassigned";
      const group = map.get(key) || { name: key, estimated: 0, actual: 0, timerHours: 0, taskCount: 0, doneCount: 0 };
      group.estimated += e.estimatedHours;
      group.actual += e.actualHours;
      group.timerHours += e.timerHours;
      group.taskCount++;
      if (e.task.status === "done" || e.task.status === "approved") group.doneCount++;
      map.set(key, group);
    });
    return [...map.values()].sort((a, b) => (b.estimated + b.actual) - (a.estimated + a.actual));
  };

  // Group by component
  const byComponent = (): GroupBreakdown[] => {
    const map = new Map<string, GroupBreakdown>();
    entries.forEach(e => {
      const key = e.componentName;
      const group = map.get(key) || { name: key, estimated: 0, actual: 0, timerHours: 0, taskCount: 0, doneCount: 0 };
      group.estimated += e.estimatedHours;
      group.actual += e.actualHours;
      group.timerHours += e.timerHours;
      group.taskCount++;
      if (e.task.status === "done" || e.task.status === "approved") group.doneCount++;
      map.set(key, group);
    });
    return [...map.values()].sort((a, b) => (b.estimated + b.actual) - (a.estimated + a.actual));
  };

  // Group by phase
  const byPhase = (): GroupBreakdown[] => {
    const map = new Map<string, GroupBreakdown>();
    entries.forEach(e => {
      const key = `${e.componentName} · ${e.phaseName}`;
      const group = map.get(key) || { name: key, estimated: 0, actual: 0, timerHours: 0, taskCount: 0, doneCount: 0 };
      group.estimated += e.estimatedHours;
      group.actual += e.actualHours;
      group.timerHours += e.timerHours;
      group.taskCount++;
      if (e.task.status === "done" || e.task.status === "approved") group.doneCount++;
      map.set(key, group);
    });
    return [...map.values()].sort((a, b) => (b.estimated + b.actual) - (a.estimated + a.actual));
  };

  // Timer history
  const timerTasks = entries.filter(e => e.timerHours > 0).sort((a, b) => b.timerHours - a.timerHours);

  const formatHours = (h: number) => h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(1)}h`;

  const BarChart = ({ items, maxVal, label }: { items: { name: string; est: number; actual: number }[]; maxVal: number; label: string }) => (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.name}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-300 font-medium truncate max-w-[60%]">{item.name}</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="text-blue-400">{formatHours(item.est)} est</span>
              <span className="text-emerald-400">{formatHours(item.actual)} actual</span>
            </div>
          </div>
          <div className="space-y-1">
            {/* Estimated bar */}
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500/50 rounded-full transition-all duration-500" style={{ width: `${maxVal > 0 ? (item.est / maxVal) * 100 : 0}%` }} />
            </div>
            {/* Actual bar */}
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500/60 rounded-full transition-all duration-500" style={{ width: `${maxVal > 0 ? (item.actual / maxVal) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const GroupView = ({ groups }: { groups: GroupBreakdown[] }) => {
    const maxVal = Math.max(...groups.map(g => Math.max(g.estimated, g.actual + g.timerHours)), 1);
    return (
      <div className="space-y-4">
        {groups.map(g => {
          const effectiveActual = g.actual || g.timerHours;
          const accuracy = g.estimated > 0 && effectiveActual > 0
            ? Math.round((Math.min(g.estimated, effectiveActual) / Math.max(g.estimated, effectiveActual)) * 100)
            : 0;
          return (
            <div key={g.name} className="glass-card rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] text-slate-200 font-semibold truncate">{g.name === "yusif" ? "👤 Yusif" : g.name === "employee-1" ? "🔩 Employee-1" : g.name === "Unassigned" ? "❓ Unassigned" : g.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                    accuracy >= 80 ? "bg-emerald-500/10 text-emerald-400" : accuracy >= 50 ? "bg-amber-500/10 text-amber-400" : accuracy > 0 ? "bg-rose-500/10 text-rose-400" : "bg-slate-800 text-slate-500"
                  }`}>{accuracy > 0 ? `${accuracy}% دقة` : "—"}</span>
                </div>
              </div>
              {/* Bars */}
              <div className="space-y-1.5 mb-2">
                <div>
                  <div className="flex justify-between text-[9px] text-slate-500 mb-0.5">
                    <span>Estimated</span>
                    <span className="text-blue-400">{formatHours(g.estimated)}</span>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-600/60 to-blue-400/60 rounded-full transition-all duration-500"
                      style={{ width: `${maxVal > 0 ? (g.estimated / maxVal) * 100 : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] text-slate-500 mb-0.5">
                    <span>Actual</span>
                    <span className="text-emerald-400">{formatHours(effectiveActual)}</span>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${
                      effectiveActual > g.estimated ? "bg-gradient-to-r from-rose-600/60 to-rose-400/60" : "bg-gradient-to-r from-emerald-600/60 to-emerald-400/60"
                    }`}
                      style={{ width: `${maxVal > 0 ? (effectiveActual / maxVal) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <span>{g.taskCount} tasks</span>
                <span>·</span>
                <span>{g.doneCount} done</span>
                {g.timerHours > 0 && (
                  <>
                    <span>·</span>
                    <span>⏱ {formatHours(g.timerHours)} tracked</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {groups.length === 0 && (
          <p className="text-center text-[11px] text-slate-600 py-8">No data available</p>
        )}
      </div>
    );
  };

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
        <div className="text-5xl mb-4 animate-float">🚫</div>
        <h2 className="text-lg font-semibold text-slate-300">Project not found</h2>
        <Link href="/" className="mt-4 text-indigo-400 text-sm hover:underline">← Back</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-mesh noise-bg">
      <div className="max-w-lg lg:max-w-5xl mx-auto px-5 lg:px-8 pt-5 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 animate-fade-in">
          <div className="flex items-center gap-3">
            <Link href={`/project/${id}`} className="text-slate-500 hover:text-slate-200 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[16px] font-bold text-white">{project.name}</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  Time ⏱
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/project/${id}/kanban`} className="px-3 py-1.5 text-[11px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-all">
              Kanban ▦
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 animate-fade-in stagger" style={{ animationDelay: "0.05s" }}>
          <div className="glass-card rounded-2xl p-4 text-center">
            <div className="text-[22px] font-bold text-blue-400">{formatHours(totalEstimated)}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">ساعات مُقَدَّرة</div>
            <div className="text-[9px] text-slate-600">Estimated</div>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <div className={`text-[22px] font-bold ${effectiveTotal > totalEstimated ? "text-rose-400" : "text-emerald-400"}`}>
              {formatHours(effectiveTotal)}
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">ساعات فعلية</div>
            <div className="text-[9px] text-slate-600">Actual</div>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <div className={`text-[22px] font-bold ${overallAccuracy >= 80 ? "text-emerald-400" : overallAccuracy >= 50 ? "text-amber-400" : overallAccuracy > 0 ? "text-rose-400" : "text-slate-500"}`}>
              {overallAccuracy > 0 ? `${overallAccuracy}%` : "—"}
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">دقة التقدير</div>
            <div className="text-[9px] text-slate-600">Accuracy</div>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <div className="text-[22px] font-bold text-cyan-400">{formatHours(totalTimer)}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">وقت المؤقت</div>
            <div className="text-[9px] text-slate-600">Timer Tracked</div>
          </div>
        </div>

        {/* Est vs Actual visual */}
        <div className="glass-card rounded-2xl p-4 mb-5 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h3 className="text-[13px] font-semibold text-slate-300 mb-3">📊 Estimated vs Actual</h3>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>🔵 Estimated</span>
                <span className="text-blue-400 font-semibold">{formatHours(totalEstimated)}</span>
              </div>
              <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, totalEstimated > 0 ? 100 : 0)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>🟢 Actual</span>
                <span className={`font-semibold ${effectiveTotal > totalEstimated ? "text-rose-400" : "text-emerald-400"}`}>{formatHours(effectiveTotal)}</span>
              </div>
              <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${effectiveTotal > totalEstimated ? "bg-gradient-to-r from-rose-600 to-rose-400" : "bg-gradient-to-r from-emerald-600 to-emerald-400"}`}
                  style={{ width: `${totalEstimated > 0 ? Math.min(100, (effectiveTotal / totalEstimated) * 100) : 0}%` }} />
              </div>
            </div>
          </div>
          {totalEstimated > 0 && effectiveTotal > 0 && (
            <div className="mt-3 text-center">
              <span className={`text-[11px] font-medium ${overEstimated ? "text-amber-400" : "text-rose-400"}`}>
                {overEstimated
                  ? `⬇ Over-estimated by ${formatHours(totalEstimated - effectiveTotal)}`
                  : `⬆ Under-estimated by ${formatHours(effectiveTotal - totalEstimated)}`
                }
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="glass-card rounded-xl p-1 mb-5 animate-fade-in overflow-x-auto scrollbar-hide" style={{ animationDelay: "0.15s" }}>
          <div className="flex gap-1 min-w-max">
            {[
              { key: "overview" as const, label: "📊 Overview" },
              { key: "assignees" as const, label: "👥 Assignees" },
              { key: "components" as const, label: "📦 Components" },
              { key: "phases" as const, label: "🔢 Phases" },
              { key: "timer" as const, label: "⏱ Timer" },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-[11px] font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/20"
                    : "text-slate-500 hover:text-slate-300"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {/* Overview: top tasks by time */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Tasks with most estimated hours */}
              <div className="glass-card rounded-2xl p-4">
                <h3 className="text-[13px] font-semibold text-slate-300 mb-3">🏆 Top Tasks by Estimated Hours</h3>
                <div className="space-y-2">
                  {entries
                    .filter(e => e.estimatedHours > 0)
                    .sort((a, b) => b.estimatedHours - a.estimatedHours)
                    .slice(0, 8)
                    .map((e, i) => {
                      const maxEst = entries.reduce((m, x) => Math.max(m, x.estimatedHours), 1);
                      return (
                        <div key={e.task.id} onClick={() => setSelectedTask(e.task)}
                          className="cursor-pointer hover:bg-slate-800/20 rounded-lg p-2 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-slate-300 truncate max-w-[65%]">{e.task.title}</span>
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="text-blue-400">{formatHours(e.estimatedHours)}</span>
                              {e.actualHours > 0 && <span className="text-emerald-400">{formatHours(e.actualHours)}</span>}
                            </div>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-600/60 to-indigo-400/60 rounded-full"
                              style={{ width: `${(e.estimatedHours / maxEst) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  {entries.filter(e => e.estimatedHours > 0).length === 0 && (
                    <p className="text-center text-[11px] text-slate-600 py-4">No tasks with estimated hours</p>
                  )}
                </div>
              </div>

              {/* Accuracy distribution */}
              <div className="glass-card rounded-2xl p-4">
                <h3 className="text-[13px] font-semibold text-slate-300 mb-3">🎯 Accuracy Breakdown</h3>
                {(() => {
                  const withAccuracy = entries.filter(e => e.accuracy > 0);
                  const excellent = withAccuracy.filter(e => e.accuracy >= 80).length;
                  const good = withAccuracy.filter(e => e.accuracy >= 50 && e.accuracy < 80).length;
                  const poor = withAccuracy.filter(e => e.accuracy < 50).length;
                  const total = withAccuracy.length || 1;

                  return (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-emerald-400">🟢 Excellent (≥80%)</span>
                          <span className="text-slate-400">{excellent} tasks</span>
                        </div>
                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${(excellent / total) * 100}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-amber-400">🟡 Good (50-80%)</span>
                          <span className="text-slate-400">{good} tasks</span>
                        </div>
                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500/60 rounded-full" style={{ width: `${(good / total) * 100}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-rose-400">🔴 Poor (&lt;50%)</span>
                          <span className="text-slate-400">{poor} tasks</span>
                        </div>
                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500/60 rounded-full" style={{ width: `${(poor / total) * 100}%` }} />
                        </div>
                      </div>
                      {withAccuracy.length === 0 && (
                        <p className="text-center text-[11px] text-slate-600 py-2">No tasks with both estimated and actual hours</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Assignee Breakdown */}
          {activeTab === "assignees" && <GroupView groups={byAssignee()} />}

          {/* Component Breakdown */}
          {activeTab === "components" && <GroupView groups={byComponent()} />}

          {/* Phase Breakdown */}
          {activeTab === "phases" && <GroupView groups={byPhase()} />}

          {/* Timer History */}
          {activeTab === "timer" && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="glass-card rounded-2xl p-4">
                <h3 className="text-[13px] font-semibold text-slate-300 mb-3">⏱ Timer Summary</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center bg-slate-900/40 rounded-xl p-3">
                    <div className="text-[18px] font-bold text-cyan-400">{formatHours(totalTimer)}</div>
                    <div className="text-[10px] text-slate-500">Total Tracked</div>
                  </div>
                  <div className="text-center bg-slate-900/40 rounded-xl p-3">
                    <div className="text-[18px] font-bold text-violet-400">{timerTasks.length}</div>
                    <div className="text-[10px] text-slate-500">Tasks Tracked</div>
                  </div>
                  <div className="text-center bg-slate-900/40 rounded-xl p-3">
                    <div className="text-[18px] font-bold text-amber-400">
                      {timerTasks.length > 0 ? formatHours(totalTimer / timerTasks.length) : "—"}
                    </div>
                    <div className="text-[10px] text-slate-500">Avg per Task</div>
                  </div>
                </div>
              </div>

              {/* Active timers */}
              {entries.filter(e => e.task.timerActive).length > 0 && (
                <div className="glass-card rounded-2xl p-4 glow-blue">
                  <h3 className="text-[13px] font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Active Timers
                  </h3>
                  <div className="space-y-2">
                    {entries.filter(e => e.task.timerActive).map(e => (
                      <div key={e.task.id} onClick={() => setSelectedTask(e.task)}
                        className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 cursor-pointer hover:bg-emerald-500/10 transition-all">
                        <span className="text-[12px] text-slate-300 truncate">{e.task.title}</span>
                        <span className="text-[11px] text-emerald-400 font-bold animate-pulse">⏱ Running</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timer history list */}
              <div className="glass-card rounded-2xl p-4">
                <h3 className="text-[13px] font-semibold text-slate-300 mb-3">📋 Timer History</h3>
                <div className="space-y-1">
                  {timerTasks.map(e => {
                    const maxTimer = timerTasks.length > 0 ? timerTasks[0].timerHours : 1;
                    return (
                      <div key={e.task.id} onClick={() => setSelectedTask(e.task)}
                        className="py-2 px-2.5 rounded-lg hover:bg-slate-800/20 cursor-pointer transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ color: STATUS_CONFIG[e.task.status]?.color, background: STATUS_CONFIG[e.task.status]?.color + "15" }}>
                              {STATUS_CONFIG[e.task.status]?.icon}
                            </span>
                            <span className="text-[12px] text-slate-300 truncate">{e.task.title}</span>
                          </div>
                          <span className="text-[11px] text-cyan-400 font-bold flex-shrink-0">{formatHours(e.timerHours)}</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-cyan-600/60 to-cyan-400/60 rounded-full"
                            style={{ width: `${(e.timerHours / maxTimer) * 100}%` }} />
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-600">
                          <span>{e.componentName} · {e.phaseName}</span>
                          {e.task.assignee && <span>· {e.task.assignee === "employee-1" ? "🔩" : "👤"}</span>}
                        </div>
                      </div>
                    );
                  })}
                  {timerTasks.length === 0 && (
                    <p className="text-center text-[11px] text-slate-600 py-8">No timer data yet. Start a timer on any task!</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Task Detail Modal */}
        {selectedTask && project && (
          <TaskDetail
            task={selectedTask}
            projectId={project.slug || project._id || id}
            allTasks={allTasks}
            onClose={() => setSelectedTask(null)}
            onUpdate={(updated) => { setProject(updated); setSelectedTask(null); }}
          />
        )}
      </div>
    </div>
  );
}
