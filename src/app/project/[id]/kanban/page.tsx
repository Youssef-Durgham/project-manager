"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { Project, Task, TaskStatus } from "@/lib/types";
import { getAllTasks, getCompletionPercent, getTaskStats } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import ProgressBar from "@/components/ProgressBar";
import TaskDetail from "@/components/TaskDetail";
import MoveTaskModal from "@/components/MoveTaskModal";
import EventToasts from "@/components/EventToasts";
import { useEvents } from "@/lib/useEvents";

const COLUMNS: { status: TaskStatus; label: string; labelAr: string; color: string; bg: string; dot: string; border: string }[] = [
  { status: "draft", label: "Draft", labelAr: "مسودة", color: "text-slate-500", bg: "bg-slate-500/5", dot: "bg-slate-500", border: "border-slate-500/20" },
  { status: "ready", label: "Ready", labelAr: "جاهز", color: "text-blue-400", bg: "bg-blue-500/5", dot: "bg-blue-400", border: "border-blue-500/20" },
  { status: "in-progress", label: "In Progress", labelAr: "قيد التنفيذ", color: "text-violet-400", bg: "bg-violet-500/5", dot: "bg-violet-400 animate-pulse", border: "border-violet-500/20" },
  { status: "review", label: "Review", labelAr: "مراجعة", color: "text-orange-400", bg: "bg-orange-500/5", dot: "bg-orange-400", border: "border-orange-500/20" },
  { status: "revision", label: "Revision", labelAr: "تعديل", color: "text-rose-400", bg: "bg-rose-500/5", dot: "bg-rose-400", border: "border-rose-500/20" },
  { status: "done", label: "Done", labelAr: "مكتمل", color: "text-emerald-400", bg: "bg-emerald-500/5", dot: "bg-emerald-400", border: "border-emerald-500/20" },
];

interface TaskWithMeta extends Task {
  componentName: string;
  phaseName: string;
}

export default function KanbanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [filterComponent, setFilterComponent] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [mobileActiveCol, setMobileActiveCol] = useState<TaskStatus>("in-progress");
  const [expandedMobileCols, setExpandedMobileCols] = useState<Set<TaskStatus> | null>(null);
  const [showMoveMenu, setShowMoveMenu] = useState<string | null>(null);
  const [moveModal, setMoveModal] = useState<{ taskId: string; taskTitle: string; fromStatus: TaskStatus; toStatus: TaskStatus } | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dragSourceStatus, setDragSourceStatus] = useState<TaskStatus | null>(null);

  const loadProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      const result = await res.json();
      setProject(result.data || result);
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => { loadProject(); }, [loadProject]);

  // Real-time SSE updates
  const { toasts, dismissToast } = useEvents({
    projectId: project?._id || id,
    onTaskUpdated: () => loadProject(),
    onProjectUpdated: () => loadProject(),
  });

  const getTasksWithMeta = useCallback((): TaskWithMeta[] => {
    if (!project) return [];
    const tasks: TaskWithMeta[] = [];
    for (const comp of project.components || []) {
      for (const phase of comp.phases || []) {
        for (const task of phase.tasks || []) {
          tasks.push({ ...task, componentName: comp.name, phaseName: phase.name });
        }
      }
    }
    return tasks;
  }, [project]);

  const allTasksMeta = getTasksWithMeta();

  // Auto-expand columns that have tasks on first load
  useEffect(() => {
    if (expandedMobileCols === null && allTasksMeta.length > 0) {
      const withTasks = new Set<TaskStatus>();
      COLUMNS.forEach(col => {
        const count = allTasksMeta.filter(t => t.status === col.status).length;
        if (count > 0) withTasks.add(col.status);
      });
      setExpandedMobileCols(withTasks.size > 0 ? withTasks : new Set(COLUMNS.map(c => c.status)));
    }
  }, [allTasksMeta, expandedMobileCols]);

  const filteredTasks = allTasksMeta.filter(t => {
    if (filterComponent !== "all" && t.componentName !== filterComponent) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterAssignee !== "all" && t.assignee !== filterAssignee) return false;
    return true;
  });

  const getColumnTasks = (status: TaskStatus) => filteredTasks.filter(t => t.status === status).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  // Initiate move — opens modal with contextual fields
  const initiateMove = (taskId: string, newStatus: TaskStatus) => {
    setShowMoveMenu(null);
    const task = allTasksMeta.find(t => t.id === taskId);
    if (!task) return;
    // If moving to same status, ignore
    if (task.status === newStatus) return;
    setMoveModal({ taskId, taskTitle: task.title, fromStatus: task.status, toStatus: newStatus });
  };

  // Execute the actual move with payload from modal
  const executeMove = async (payload: Record<string, any>) => {
    if (!moveModal) return;
    setMoveModal(null);
    try {
      const res = await fetch(`/api/projects/${id}/task/${moveModal.taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        setProject(result.data || result);
      }
    } catch {}
  };

  // Save reorder to DB
  const saveReorder = async (taskOrders: { taskId: string; order: number }[]) => {
    try {
      const res = await fetch(`/api/projects/${id}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskOrders }),
      });
      if (res.ok) {
        const result = await res.json();
        setProject(result.data || result);
      }
    } catch {}
  };

  // Desktop drag handlers
  const handleDragStart = (taskId: string, status: TaskStatus) => {
    setDraggedTask(taskId);
    setDragSourceStatus(status);
  };
  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => { e.preventDefault(); setDragOverColumn(status); };
  const handleDragLeave = () => setDragOverColumn(null);
  
  const handleDragOverTask = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTaskId(targetTaskId);
  };
  
  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (draggedTask) {
      const sourceTask = allTasksMeta.find(t => t.id === draggedTask);
      if (sourceTask && sourceTask.status === status && dragOverTaskId) {
        // Same column reorder
        const colTasks = getColumnTasks(status);
        const fromIdx = colTasks.findIndex(t => t.id === draggedTask);
        const toIdx = colTasks.findIndex(t => t.id === dragOverTaskId);
        if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
          const reordered = [...colTasks];
          const [moved] = reordered.splice(fromIdx, 1);
          reordered.splice(toIdx, 0, moved);
          const taskOrders = reordered.map((t, i) => ({ taskId: t.id, order: i }));
          saveReorder(taskOrders);
        }
      } else if (sourceTask && sourceTask.status !== status) {
        // Cross-column move
        initiateMove(draggedTask, status);
      }
    }
    setDraggedTask(null);
    setDragOverColumn(null);
    setDragOverTaskId(null);
    setDragSourceStatus(null);
  };

  const toggleMobileCol = (status: TaskStatus) => {
    setExpandedMobileCols(prev => {
      const next = new Set(prev || []);
      next.has(status) ? next.delete(status) : next.add(status);
      return next;
    });
  };

  const priorityDot: Record<string, string> = {
    critical: "bg-rose-500",
    high: "bg-amber-500",
    medium: "bg-blue-500",
    low: "bg-emerald-500",
  };

  const priorityLabel: Record<string, string> = {
    critical: "🚨",
    high: "🔴",
    medium: "",
    low: "🟢",
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

  const componentNames = [...new Set(allTasksMeta.map(t => t.componentName))];
  const allTasks = getAllTasks(project);
  const overallPercent = getCompletionPercent(allTasks);
  const stats = getTaskStats(allTasks);

  // Task card component shared between mobile and desktop
  const TaskCard = ({ task, compact = false }: { task: TaskWithMeta; compact?: boolean }) => (
    <div
      draggable
      onDragStart={() => handleDragStart(task.id, task.status)}
      onDragEnd={() => { setDraggedTask(null); setDragOverColumn(null); setDragOverTaskId(null); setDragSourceStatus(null); }}
      onDragOver={(e) => handleDragOverTask(e, task.id)}
      onClick={() => setSelectedTask(task)}
      className={`glass-card rounded-xl p-3 cursor-pointer hover:bg-white/[0.03] transition-all group press ${
        draggedTask === task.id ? "opacity-40 scale-95" : ""
      } ${dragOverTaskId === task.id && draggedTask !== task.id ? "border-t-2 border-t-indigo-400" : ""}`}
    >
      {/* Priority & Component */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[task.priority] || "bg-slate-500"}`} />
          <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">{task.componentName}</span>
          {task.priority === "critical" || task.priority === "high" ? (
            <span className="text-[10px]">{priorityLabel[task.priority]}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {task.assignee && (
            <span className="text-[11px]">{task.assignee === "employee-1" ? "🔩" : "👤"}</span>
          )}
          {/* Move button (mobile) */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowMoveMenu(showMoveMenu === task.id ? null : task.id); }}
            className="md:hidden w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-800/60 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-[13px] font-medium text-slate-300 group-hover:text-slate-100 transition-colors leading-snug mb-2">
        {task.title}
      </h4>

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-slate-600">{task.phaseName}</span>
        {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
          <span className="text-[10px] text-slate-600">
            ✓{task.acceptanceCriteria.filter(c => c.checked).length}/{task.acceptanceCriteria.length}
          </span>
        )}
        {task.subtasks && task.subtasks.length > 0 && (
          <span className="text-[10px] text-slate-600">
            ☐{task.subtasks.filter(s => s.checked).length}/{task.subtasks.length}
          </span>
        )}
        {task.dueDate && (
          <span className={`text-[10px] font-medium ${new Date(task.dueDate) < new Date() ? "text-rose-400" : "text-slate-500"}`}>
            📅 {new Date(task.dueDate).toLocaleDateString("en", { month: "short", day: "numeric" })}
          </span>
        )}
        {task.dependencies && task.dependencies.length > 0 && (
          <span className="text-[10px] text-amber-500/60">🔗{task.dependencies.length}</span>
        )}
        {task.recurring?.enabled && (
          <span className="text-[10px] text-cyan-400/70" title={`Recurring: ${task.recurring.frequency}`}>🔄</span>
        )}
      </div>

      {/* Move menu (mobile) */}
      {showMoveMenu === task.id && (
        <div className="mt-2 flex flex-wrap gap-1.5 animate-scale-in" onClick={(e) => e.stopPropagation()}>
          {COLUMNS.filter(c => c.status !== task.status).map(c => (
            <button
              key={c.status}
              onClick={(e) => { e.stopPropagation(); initiateMove(task.id, c.status); }}
              className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-medium transition-all ${c.border} ${c.color} hover:${c.bg}`}
            >
              → {c.labelAr}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen gradient-mesh noise-bg">
      {/* Header - consistent with project detail */}
      <div className="sticky top-0 z-30 glass border-b border-slate-800/50">
        <div className="max-w-lg lg:max-w-[1400px] mx-auto px-5 py-3">
          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link href={`/project/${id}`} className="text-slate-500 hover:text-slate-200 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-[16px] font-bold text-white truncate">{project.name}</h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold flex-shrink-0">
                    Kanban
                  </span>
                </div>
              </div>
            </div>
            <Link href={`/project/${id}`} className="text-[11px] text-slate-500 hover:text-slate-300 font-medium flex-shrink-0">
              📂 List View
            </Link>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-3">
                {COLUMNS.map(col => {
                  const count = getColumnTasks(col.status).length;
                  return (
                    <div key={col.status} className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                      <span className={`text-[10px] font-medium ${col.color}`}>{count}</span>
                    </div>
                  );
                })}
              </div>
              <span className={`text-[11px] font-bold ${overallPercent >= 80 ? "text-emerald-400" : overallPercent >= 50 ? "text-blue-400" : "text-amber-400"}`}>
                {overallPercent}%
              </span>
            </div>
            <ProgressBar value={overallPercent} size="sm" />
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <select value={filterComponent} onChange={e => setFilterComponent(e.target.value)}
              className="text-[11px] bg-slate-900/60 border border-slate-700/30 rounded-lg px-2.5 py-1.5 text-slate-300 input-focus min-w-0 appearance-none">
              <option value="all">All Components</option>
              {componentNames.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
              className="text-[11px] bg-slate-900/60 border border-slate-700/30 rounded-lg px-2.5 py-1.5 text-slate-300 input-focus min-w-0 appearance-none">
              <option value="all">All Priorities</option>
              <option value="critical">🚨 Critical</option>
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
            <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
              className="text-[11px] bg-slate-900/60 border border-slate-700/30 rounded-lg px-2.5 py-1.5 text-slate-300 input-focus min-w-0 appearance-none">
              <option value="all">All Assignees</option>
              <option value="yusif">👤 Yusif</option>
              <option value="employee-1">🔩 Employee-1</option>
            </select>
          </div>
        </div>
      </div>

      {/* === MOBILE: Stacked Columns (accordion) === */}
      <div className="lg:hidden max-w-lg mx-auto px-5 py-4 pb-28 space-y-3 stagger">
        {COLUMNS.map(col => {
          const colTasks = getColumnTasks(col.status);
          const isExpanded = expandedMobileCols?.has(col.status) ?? false;
          
          return (
            <div key={col.status} className="glass-card rounded-2xl overflow-hidden">
              {/* Column Header - clickable */}
              <button
                onClick={() => toggleMobileCol(col.status)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                  <span className={`text-[13px] font-semibold ${col.color}`}>{col.label}</span>
                  <span className="text-[11px] text-slate-600">{col.labelAr}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-slate-500 bg-slate-800/40 px-2 py-0.5 rounded-md min-w-[28px] text-center">
                    {colTasks.length}
                  </span>
                  <svg className={`w-4 h-4 text-slate-600 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded cards */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 animate-fade-in">
                  {colTasks.length === 0 ? (
                    <div className="text-center py-6 text-[11px] text-slate-700">
                      No tasks
                    </div>
                  ) : (
                    colTasks.map(task => <TaskCard key={task.id} task={task} />)
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* === DESKTOP: Horizontal Kanban Board === */}
      <div className="hidden lg:block overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 p-4 min-w-max max-w-[1400px] mx-auto">
          {COLUMNS.map(col => {
            const colTasks = getColumnTasks(col.status);
            const isOver = dragOverColumn === col.status;

            return (
              <div
                key={col.status}
                className={`w-[280px] flex-shrink-0 rounded-2xl border transition-all duration-200 ${col.border} ${isOver ? `${col.bg} scale-[1.01]` : "bg-slate-900/20"}`}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.status)}
              >
                {/* Column Header */}
                <div className="px-4 py-3 border-b border-slate-800/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <span className={`text-[12px] font-semibold ${col.color}`}>{col.label}</span>
                      <span className="text-[10px] text-slate-600">{col.labelAr}</span>
                    </div>
                    <span className="text-[12px] font-bold text-slate-500 bg-slate-800/40 px-2 py-0.5 rounded-md">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-hide">
                  {colTasks.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-slate-700">
                      No tasks
                    </div>
                  ) : (
                    colTasks.map(task => <TaskCard key={task.id} task={task} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Move Task Modal */}
      {moveModal && (
        <MoveTaskModal
          taskTitle={moveModal.taskTitle}
          taskId={moveModal.taskId}
          fromStatus={moveModal.fromStatus}
          toStatus={moveModal.toStatus}
          onConfirm={executeMove}
          onCancel={() => setMoveModal(null)}
        />
      )}

      {/* Task Detail Modal */}
      {selectedTask && project && (
        <TaskDetail
          task={selectedTask}
          projectId={project.slug || project._id || id}
          allTasks={getAllTasks(project)}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updated) => { setProject(updated); setSelectedTask(null); }}
        />
      )}

      {/* Real-time update toasts */}
      <EventToasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
