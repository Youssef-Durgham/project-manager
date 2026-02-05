"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { Project, Task, Sprint, STATUS_CONFIG, PRIORITY_CONFIG } from "@/lib/types";
import { getAllTasks } from "@/lib/utils";
import ProgressBar from "@/components/ProgressBar";
import TaskDetail from "@/components/TaskDetail";

export default function SprintsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [planningSprintId, setPlanningSprintId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"board" | "summary">("board");
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "", goals: "" });

  const loadData = useCallback(async () => {
    try {
      const [projRes, sprintRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/sprints?projectId=${id}`),
      ]);
      const projData = await projRes.json();
      const sprintData = await sprintRes.json();
      setProject(projData.data || projData);
      setSprints(sprintData.data || []);
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const allTasks = project ? getAllTasks(project) : [];
  const taskMap = new Map(allTasks.map(t => [t.id, t]));

  // Backlog = tasks not in any sprint
  const allSprintTaskIds = new Set(sprints.flatMap(s => s.taskIds || []));
  const backlogTasks = allTasks.filter(t => !allSprintTaskIds.has(t.id));

  const activeSprint = sprints.find(s => s.status === "active");
  const planningSprints = sprints.filter(s => s.status === "planning");
  const completedSprints = sprints.filter(s => s.status === "completed");

  const createSprint = async () => {
    if (!form.name.trim() || !form.startDate || !form.endDate) return;
    await fetch("/api/sprints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        projectId: id,
        startDate: form.startDate,
        endDate: form.endDate,
        goals: form.goals.split("\n").filter(g => g.trim()),
        taskIds: [],
        status: "planning",
      }),
    });
    setForm({ name: "", startDate: "", endDate: "", goals: "" });
    setShowCreate(false);
    loadData();
  };

  const updateSprint = async (sprintId: string, updates: Partial<Sprint>) => {
    await fetch("/api/sprints", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sprintId, ...updates }),
    });
    loadData();
  };

  const deleteSprint = async (sprintId: string) => {
    await fetch(`/api/sprints?id=${sprintId}`, { method: "DELETE" });
    loadData();
  };

  const addTaskToSprint = async (sprintId: string, taskId: string) => {
    const sprint = sprints.find(s => s._id === sprintId);
    if (!sprint) return;
    const newTaskIds = [...(sprint.taskIds || []), taskId];
    await updateSprint(sprintId, { taskIds: newTaskIds });
  };

  const removeTaskFromSprint = async (sprintId: string, taskId: string) => {
    const sprint = sprints.find(s => s._id === sprintId);
    if (!sprint) return;
    const newTaskIds = (sprint.taskIds || []).filter(id => id !== taskId);
    await updateSprint(sprintId, { taskIds: newTaskIds });
  };

  const getSprintStats = (sprint: Sprint) => {
    const tasks = (sprint.taskIds || []).map(tid => taskMap.get(tid)).filter(Boolean) as Task[];
    const total = tasks.length;
    const done = tasks.filter(t => t.status === "done" || t.status === "approved").length;
    const inProgress = tasks.filter(t => t.status === "in-progress").length;
    const review = tasks.filter(t => t.status === "review").length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    const totalEstHours = tasks.reduce((s, t) => s + (t.estimatedHours || 0), 0);
    const totalActualHours = tasks.reduce((s, t) => s + (t.actualHours || 0), 0);
    return { total, done, inProgress, review, percent, totalEstHours, totalActualHours, tasks };
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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
                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                  Sprints 🏃
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/project/${id}/kanban`} className="px-3 py-1.5 text-[11px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-all">
              Kanban ▦
            </Link>
            <Link href={`/project/${id}/calendar`} className="px-3 py-1.5 text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-all">
              📅
            </Link>
          </div>
        </div>

        {/* View Toggle */}
        <div className="glass-card rounded-xl p-1 mb-5 animate-fade-in flex gap-1" style={{ animationDelay: "0.05s" }}>
          {(["board", "summary"] as const).map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              className={`flex-1 py-2.5 text-[11px] font-semibold rounded-lg transition-all ${
                activeView === v ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/20" : "text-slate-500 hover:text-slate-300"
              }`}>
              {v === "board" ? "📋 Sprint Board" : "📊 Summary"}
            </button>
          ))}
        </div>

        {/* Active Sprint */}
        {activeSprint && activeView === "board" && (() => {
          const stats = getSprintStats(activeSprint);
          const daysLeft = getDaysRemaining(activeSprint.endDate);
          return (
            <div className="mb-5 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="glass-card rounded-2xl p-4 glow-blue">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <h3 className="text-[14px] font-bold text-white">{activeSprint.name}</h3>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {new Date(activeSprint.startDate).toLocaleDateString("en", { month: "short", day: "numeric" })} → {new Date(activeSprint.endDate).toLocaleDateString("en", { month: "short", day: "numeric" })}
                      <span className={`ml-2 font-semibold ${daysLeft <= 2 ? "text-rose-400" : daysLeft <= 5 ? "text-amber-400" : "text-slate-400"}`}>
                        {daysLeft > 0 ? `${daysLeft} days left` : "Overdue!"}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-[20px] font-bold ${stats.percent >= 80 ? "text-emerald-400" : stats.percent >= 50 ? "text-blue-400" : "text-amber-400"}`}>
                      {stats.percent}%
                    </div>
                    <p className="text-[10px] text-slate-500">{stats.done}/{stats.total} مكتمل</p>
                  </div>
                </div>
                <ProgressBar value={stats.percent} size="lg" animated />

                {/* Goals */}
                {(activeSprint.goals || []).length > 0 && (
                  <div className="mt-3 space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">أهداف السبرنت</span>
                    {activeSprint.goals.map((g, i) => {
                      // Count goal-related progress - simple heuristic
                      return (
                        <div key={i} className="flex items-center gap-2 text-[12px] text-slate-400">
                          <span className="text-emerald-400">◉</span> {g}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Stat pills */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[
                    { label: "Done", val: stats.done, color: "text-emerald-400", dot: "bg-emerald-400" },
                    { label: "Active", val: stats.inProgress, color: "text-violet-400", dot: "bg-violet-400" },
                    { label: "Review", val: stats.review, color: "text-orange-400", dot: "bg-orange-400" },
                    { label: "Remaining", val: stats.total - stats.done, color: "text-slate-400", dot: "bg-slate-400" },
                  ].map(s => (
                    <div key={s.label} className="text-center bg-slate-900/40 rounded-xl p-2">
                      <div className={`text-[16px] font-bold ${s.color}`}>{s.val}</div>
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        <span className={`w-1 h-1 rounded-full ${s.dot}`} />
                        <span className="text-[9px] text-slate-600">{s.label}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sprint Tasks */}
                <div className="mt-4 space-y-1">
                  {stats.tasks.map(task => (
                    <div key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-slate-800/30 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {(task.status === "done" || task.status === "approved") ? (
                          <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                            task.status === "in-progress" ? "border-violet-400" : task.status === "review" ? "border-orange-400" : "border-slate-600"
                          }`} />
                        )}
                        <span className={`text-[12px] truncate ${task.status === "done" ? "text-slate-600 line-through" : "text-slate-300"}`}>
                          {task.title}
                        </span>
                        {(task.priority === "high" || task.priority === "critical") && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ color: STATUS_CONFIG[task.status]?.color, background: STATUS_CONFIG[task.status]?.color + "15" }}>
                          {STATUS_CONFIG[task.status]?.labelAr}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeTaskFromSprint(activeSprint._id!, task.id); }}
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-600 hover:text-rose-400 transition-all"
                          title="Remove from sprint"
                        >✕</button>
                      </div>
                    </div>
                  ))}
                  {stats.tasks.length === 0 && (
                    <p className="text-center text-[11px] text-slate-600 py-4">No tasks in this sprint</p>
                  )}
                </div>

                {/* Complete sprint button */}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setPlanningSprintId(activeSprint._id!)}
                    className="flex-1 text-[11px] font-medium py-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all">
                    + Add Tasks
                  </button>
                  <button onClick={() => updateSprint(activeSprint._id!, { status: "completed" })}
                    className="flex-1 text-[11px] font-medium py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                    ✓ Complete Sprint
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Summary View */}
        {activeView === "summary" && (
          <div className="space-y-4 animate-fade-in stagger">
            {/* Burndown-style stats */}
            {activeSprint && (() => {
              const stats = getSprintStats(activeSprint);
              const startDate = new Date(activeSprint.startDate);
              const endDate = new Date(activeSprint.endDate);
              const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
              const elapsedDays = Math.max(0, Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
              const idealProgress = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
              const velocity = elapsedDays > 0 ? (stats.done / elapsedDays).toFixed(1) : "0";

              return (
                <div className="glass-card rounded-2xl p-4">
                  <h3 className="text-[13px] font-semibold text-slate-300 mb-3">🏃 Sprint Burndown — {activeSprint.name}</h3>
                  
                  {/* Visual burndown bar */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>Ideal Progress</span>
                        <span>{idealProgress}%</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-500/30 rounded-full transition-all" style={{ width: `${idealProgress}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>Actual Progress</span>
                        <span className={stats.percent >= idealProgress ? "text-emerald-400" : "text-rose-400"}>{stats.percent}%</span>
                      </div>
                      <ProgressBar value={stats.percent} size="sm" animated />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center bg-slate-900/40 rounded-xl p-3">
                      <div className="text-[18px] font-bold text-cyan-400">{velocity}</div>
                      <div className="text-[10px] text-slate-500">Tasks/Day</div>
                    </div>
                    <div className="text-center bg-slate-900/40 rounded-xl p-3">
                      <div className="text-[18px] font-bold text-violet-400">{elapsedDays}/{totalDays}</div>
                      <div className="text-[10px] text-slate-500">Days Elapsed</div>
                    </div>
                    <div className="text-center bg-slate-900/40 rounded-xl p-3">
                      <div className={`text-[18px] font-bold ${stats.percent >= idealProgress ? "text-emerald-400" : "text-rose-400"}`}>
                        {stats.percent >= idealProgress ? "🟢" : "🔴"}
                      </div>
                      <div className="text-[10px] text-slate-500">Health</div>
                    </div>
                  </div>

                  {/* Hours */}
                  {(stats.totalEstHours > 0 || stats.totalActualHours > 0) && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="text-center bg-slate-900/40 rounded-xl p-3">
                        <div className="text-[16px] font-bold text-blue-400">{stats.totalEstHours}h</div>
                        <div className="text-[10px] text-slate-500">Estimated</div>
                      </div>
                      <div className="text-center bg-slate-900/40 rounded-xl p-3">
                        <div className="text-[16px] font-bold text-amber-400">{stats.totalActualHours}h</div>
                        <div className="text-[10px] text-slate-500">Actual</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* All Sprints Summary */}
            <div className="glass-card rounded-2xl p-4">
              <h3 className="text-[13px] font-semibold text-slate-300 mb-3">📊 All Sprints</h3>
              <div className="space-y-2">
                {sprints.map(s => {
                  const st = getSprintStats(s);
                  return (
                    <div key={s._id} className="bg-slate-900/40 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            s.status === "active" ? "bg-emerald-400 animate-pulse" : s.status === "completed" ? "bg-slate-500" : "bg-blue-400"
                          }`} />
                          <span className="text-[12px] font-semibold text-slate-300">{s.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold uppercase ${
                            s.status === "active" ? "bg-emerald-500/10 text-emerald-400" : s.status === "completed" ? "bg-slate-500/10 text-slate-400" : "bg-blue-500/10 text-blue-400"
                          }`}>{s.status}</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-400">{st.percent}%</span>
                      </div>
                      <ProgressBar value={st.percent} size="sm" />
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                        <span>{st.total} tasks</span>
                        <span>·</span>
                        <span>{st.done} done</span>
                        <span>·</span>
                        <span>{st.totalEstHours}h est</span>
                      </div>
                    </div>
                  );
                })}
                {sprints.length === 0 && (
                  <p className="text-center text-[11px] text-slate-600 py-4">No sprints created yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Planning Sprints */}
        {activeView === "board" && planningSprints.length > 0 && (
          <div className="mb-5 space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
            <h3 className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider lg:col-span-2">📋 Planning</h3>
            {planningSprints.map(sprint => {
              const stats = getSprintStats(sprint);
              return (
                <div key={sprint._id} className="glass-card rounded-2xl p-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[13px] font-semibold text-slate-200">{sprint.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">Planning</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">
                    {new Date(sprint.startDate).toLocaleDateString("en", { month: "short", day: "numeric" })} → {new Date(sprint.endDate).toLocaleDateString("en", { month: "short", day: "numeric" })}
                    · {stats.total} tasks
                  </p>
                  
                  {/* Sprint tasks */}
                  {stats.tasks.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {stats.tasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-800/30 cursor-pointer group"
                          onClick={() => setSelectedTask(task)}>
                          <span className="text-[11px] text-slate-400 truncate">{task.title}</span>
                          <button onClick={(e) => { e.stopPropagation(); removeTaskFromSprint(sprint._id!, task.id); }}
                            className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-600 hover:text-rose-400">✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Goals */}
                  {(sprint.goals || []).length > 0 && (
                    <div className="mb-3 space-y-1">
                      {sprint.goals.map((g, i) => (
                        <div key={i} className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <span className="text-cyan-400">◉</span> {g}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => setPlanningSprintId(sprint._id!)}
                      className="flex-1 text-[11px] font-medium py-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all">
                      + Add Tasks
                    </button>
                    <button onClick={() => updateSprint(sprint._id!, { status: "active" })}
                      className="flex-1 text-[11px] font-medium py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                      ▶ Start Sprint
                    </button>
                    <button onClick={() => deleteSprint(sprint._id!)}
                      className="text-[11px] px-3 py-2 rounded-lg text-slate-600 hover:text-rose-400 transition-all">
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Completed Sprints */}
        {activeView === "board" && completedSprints.length > 0 && (
          <div className="mb-5 space-y-3">
            <h3 className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">✅ Completed</h3>
            {completedSprints.map(sprint => {
              const stats = getSprintStats(sprint);
              return (
                <div key={sprint._id} className="glass-card rounded-2xl p-4 opacity-60 animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[13px] font-semibold text-slate-400">{sprint.name}</h4>
                    <span className="text-[11px] font-bold text-emerald-400">{stats.percent}%</span>
                  </div>
                  <ProgressBar value={stats.percent} size="sm" />
                  <p className="text-[10px] text-slate-600 mt-2">{stats.done}/{stats.total} tasks done · {stats.totalEstHours}h estimated</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Sprint Button/Form */}
        {activeView === "board" && (
          showCreate ? (
            <div className="glass-card rounded-2xl p-4 animate-scale-in mb-5">
              <h4 className="text-[13px] font-semibold text-slate-300 mb-3">🏃 New Sprint</h4>
              <input type="text" placeholder="Sprint name (e.g. Sprint 3)" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-900/60 border border-slate-700/30 rounded-lg px-3 py-2 text-[13px] text-slate-200 placeholder-slate-600 input-focus mb-2" autoFocus />
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                    className="w-full bg-slate-900/60 border border-slate-700/30 rounded-lg px-3 py-2 text-[12px] text-slate-200 input-focus" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">End Date</label>
                  <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                    className="w-full bg-slate-900/60 border border-slate-700/30 rounded-lg px-3 py-2 text-[12px] text-slate-200 input-focus" />
                </div>
              </div>
              <textarea placeholder="Sprint goals (one per line)..." value={form.goals}
                onChange={e => setForm({ ...form, goals: e.target.value })}
                className="w-full bg-slate-900/60 border border-slate-700/30 rounded-lg px-3 py-2 text-[12px] text-slate-200 placeholder-slate-600 input-focus mb-3 resize-none" rows={3} />
              <div className="flex gap-2">
                <button onClick={createSprint} className="flex-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[12px] font-semibold py-2.5 rounded-lg transition-colors border border-cyan-500/20">Create Sprint</button>
                <button onClick={() => setShowCreate(false)} className="px-4 text-[12px] text-slate-500 hover:text-slate-300">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowCreate(true)}
              className="w-full py-3.5 text-[12px] text-slate-600 hover:text-cyan-400 border-2 border-dashed border-slate-800/40 hover:border-cyan-500/20 rounded-2xl transition-all font-medium mb-5">
              + Create Sprint
            </button>
          )
        )}

        {/* Sprint Planning Modal: select tasks from backlog */}
        {planningSprintId && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center animate-fade-in" onClick={() => setPlanningSprintId(null)}>
            <div className="glass-card rounded-t-2xl sm:rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-slate-800/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-bold text-white">📋 Add Tasks to Sprint</h3>
                  <button onClick={() => setPlanningSprintId(null)} className="text-slate-500 hover:text-slate-300 text-lg">✕</button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Backlog: {backlogTasks.length} tasks available</p>
              </div>
              <div className="overflow-y-auto max-h-[60vh] p-4 space-y-1">
                {backlogTasks.length === 0 ? (
                  <p className="text-center text-[12px] text-slate-500 py-8">All tasks are assigned to sprints</p>
                ) : (
                  backlogTasks.map(task => (
                    <div key={task.id}
                      onClick={() => addTaskToSprint(planningSprintId, task.id)}
                      className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-indigo-500/10 transition-all cursor-pointer group border border-transparent hover:border-indigo-500/20">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0`} style={{ background: PRIORITY_CONFIG[task.priority]?.color }} />
                        <span className="text-[12px] text-slate-300 truncate">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ color: STATUS_CONFIG[task.status]?.color, background: STATUS_CONFIG[task.status]?.color + "15" }}>
                          {STATUS_CONFIG[task.status]?.labelAr}
                        </span>
                        <span className="text-indigo-400 opacity-0 group-hover:opacity-100 text-[11px] font-semibold transition-opacity">+ Add</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

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
