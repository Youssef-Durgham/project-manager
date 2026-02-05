"use client";

import { type ReactElement } from "react";
import { useEffect, useState, use, useCallback, useRef } from "react";
import Link from "next/link";
import { Project, Task, STATUS_CONFIG, PRIORITY_CONFIG, Component as ProjectComponent, Phase } from "@/lib/types";
import { getAllTasks } from "@/lib/utils";
import TaskDetail from "@/components/TaskDetail";

interface GanttTask {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  status: string;
  priority: string;
  dependencies: string[];
  phaseId: string;
  phaseName: string;
  componentName: string;
  task: Task;
}

interface GanttPhase {
  id: string;
  name: string;
  componentName: string;
  tasks: GanttTask[];
  startDate: Date;
  endDate: Date;
}

export default function GanttPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [zoomLevel, setZoomLevel] = useState<"day" | "week">("week");
  const scrollRef = useRef<HTMLDivElement>(null);

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build gantt data from project structure
  const buildGanttData = (): { phases: GanttPhase[]; minDate: Date; maxDate: Date } => {
    if (!project) return { phases: [], minDate: today, maxDate: today };

    const phases: GanttPhase[] = [];
    let globalMin = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000);
    let globalMax = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);

    for (const comp of project.components || []) {
      for (const phase of comp.phases || []) {
        const ganttTasks: GanttTask[] = [];

        for (const task of phase.tasks || []) {
          // Determine start/end dates
          let startDate: Date;
          let endDate: Date;

          if (task.startedAt) {
            startDate = new Date(task.startedAt);
          } else if (task.createdAt) {
            startDate = new Date(task.createdAt);
          } else {
            startDate = new Date(today);
          }

          if (task.completedAt) {
            endDate = new Date(task.completedAt);
          } else if (task.dueDate) {
            endDate = new Date(task.dueDate);
          } else {
            // Default: estimatedHours or 1 week
            const hours = task.estimatedHours || 40;
            const daysEstimate = Math.max(1, Math.ceil(hours / 8));
            endDate = new Date(startDate.getTime() + daysEstimate * 24 * 60 * 60 * 1000);
          }

          // Ensure end is after start
          if (endDate <= startDate) {
            endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          }

          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);

          ganttTasks.push({
            id: task.id,
            title: task.title,
            startDate,
            endDate,
            status: task.status,
            priority: task.priority,
            dependencies: task.dependencies || [],
            phaseId: phase.id,
            phaseName: phase.name,
            componentName: comp.name,
            task,
          });

          if (startDate < globalMin) globalMin = new Date(startDate);
          if (endDate > globalMax) globalMax = new Date(endDate);
        }

        if (ganttTasks.length > 0) {
          const phaseStart = ganttTasks.reduce((min, t) => t.startDate < min ? t.startDate : min, ganttTasks[0].startDate);
          const phaseEnd = ganttTasks.reduce((max, t) => t.endDate > max ? t.endDate : max, ganttTasks[0].endDate);
          phases.push({
            id: phase.id,
            name: phase.name,
            componentName: comp.name,
            tasks: ganttTasks,
            startDate: phaseStart,
            endDate: phaseEnd,
          });
        }
      }
    }

    // Add some padding
    globalMin = new Date(globalMin.getTime() - 7 * 24 * 60 * 60 * 1000);
    globalMax = new Date(globalMax.getTime() + 14 * 24 * 60 * 60 * 1000);

    return { phases, minDate: globalMin, maxDate: globalMax };
  };

  const { phases, minDate, maxDate } = buildGanttData();

  const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
  const dayWidth = zoomLevel === "week" ? 20 : 40;
  const timelineWidth = totalDays * dayWidth;
  const ROW_HEIGHT = 36;
  const LABEL_WIDTH = 180;

  const getBarPosition = (start: Date, end: Date) => {
    const startOffset = Math.max(0, Math.ceil((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
    const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    return {
      left: startOffset * dayWidth,
      width: duration * dayWidth,
    };
  };

  const getStatusBarColor = (status: string) => {
    const colors: Record<string, string> = {
      "done": "bg-emerald-500/70",
      "approved": "bg-cyan-500/60",
      "in-progress": "bg-violet-500/70",
      "review": "bg-orange-500/60",
      "revision": "bg-rose-500/60",
      "ready": "bg-blue-500/50",
      "waiting": "bg-amber-500/40",
    };
    return colors[status] || "bg-slate-500/40";
  };

  // Generate week markers
  const weekMarkers: { date: Date; label: string; offset: number }[] = [];
  const tempDate = new Date(minDate);
  while (tempDate <= maxDate) {
    if (tempDate.getDay() === 1) { // Monday
      const offset = Math.ceil((tempDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
      weekMarkers.push({
        date: new Date(tempDate),
        label: tempDate.toLocaleDateString("en", { month: "short", day: "numeric" }),
        offset: offset * dayWidth,
      });
    }
    tempDate.setDate(tempDate.getDate() + 1);
  }

  // Today marker
  const todayOffset = Math.ceil((today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;

  // Build task positions map for dependency arrows
  const taskRowMap = new Map<string, number>();
  let rowIndex = 0;
  for (const phase of phases) {
    rowIndex++; // phase header
    for (const task of phase.tasks) {
      taskRowMap.set(task.id, rowIndex);
      rowIndex++;
    }
  }

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current && todayOffset > 0) {
      scrollRef.current.scrollLeft = Math.max(0, todayOffset - 200);
    }
  }, [todayOffset, loading]);

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

  const totalRows = phases.reduce((s, p) => s + 1 + p.tasks.length, 0);

  return (
    <div className="min-h-screen gradient-mesh noise-bg">
      <div className="max-w-lg lg:max-w-full mx-auto px-5 pt-5 pb-28">
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
                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold">
                  Timeline 📊
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

        {/* Zoom Controls */}
        <div className="glass-card rounded-xl p-2 mb-4 flex items-center justify-between animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <div className="flex gap-1">
            {(["week", "day"] as const).map(z => (
              <button key={z} onClick={() => setZoomLevel(z)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                  zoomLevel === z ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/20" : "text-slate-500 hover:text-slate-300"
                }`}>
                {z === "week" ? "📅 Week" : "📆 Day"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-sm bg-emerald-500/70" /> Done</span>
            <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-sm bg-violet-500/70" /> Active</span>
            <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-sm bg-blue-500/50" /> Ready</span>
          </div>
        </div>

        {/* Gantt Chart */}
        {phases.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center animate-fade-in">
            <div className="text-4xl mb-3 animate-float">📊</div>
            <p className="text-[13px] text-slate-400 font-medium">No tasks to display</p>
            <p className="text-[11px] text-slate-600 mt-1">Add tasks with dates to see the timeline</p>
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="flex">
              {/* Task Labels (fixed left) */}
              <div className="flex-shrink-0 border-r border-slate-800/50" style={{ width: LABEL_WIDTH }}>
                <div className="h-8 border-b border-slate-800/50 flex items-center px-3">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Task</span>
                </div>
                {phases.map(phase => (
                  <div key={phase.id}>
                    {/* Phase header */}
                    <div className="flex items-center gap-2 px-3 bg-slate-800/30 border-b border-slate-800/30" style={{ height: ROW_HEIGHT }}>
                      <span className="text-[10px] text-slate-400 font-bold truncate">{phase.componentName}</span>
                      <span className="text-[10px] text-slate-600">·</span>
                      <span className="text-[10px] text-slate-500 font-semibold truncate">{phase.name}</span>
                    </div>
                    {/* Task labels */}
                    {phase.tasks.map(task => (
                      <div key={task.id}
                        onClick={() => setSelectedTask(task.task)}
                        className="flex items-center gap-1.5 px-3 border-b border-slate-800/20 hover:bg-slate-800/20 cursor-pointer transition-colors"
                        style={{ height: ROW_HEIGHT }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]?.color || "#64748b" }} />
                        <span className="text-[11px] text-slate-300 truncate">{task.title}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Timeline (scrollable) */}
              <div ref={scrollRef} className="flex-1 overflow-x-auto scrollbar-hide">
                <div style={{ width: timelineWidth, position: "relative" }}>
                  {/* Time header */}
                  <div className="h-8 border-b border-slate-800/50 relative">
                    {weekMarkers.map((wm, i) => (
                      <div key={i} className="absolute top-0 h-full flex items-center" style={{ left: wm.offset }}>
                        <span className="text-[9px] text-slate-500 font-medium whitespace-nowrap pl-1">{wm.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Grid + Bars */}
                  <div style={{ position: "relative", height: totalRows * ROW_HEIGHT }}>
                    {/* Vertical week lines */}
                    {weekMarkers.map((wm, i) => (
                      <div key={i} className="absolute top-0 bottom-0 border-l border-slate-800/30" style={{ left: wm.offset }} />
                    ))}

                    {/* Today line */}
                    <div className="absolute top-0 bottom-0 border-l-2 border-indigo-500/50 z-20" style={{ left: todayOffset }}>
                      <div className="absolute -top-0 -left-[7px] w-3.5 h-3.5 bg-indigo-500 rounded-full border-2 border-slate-900" />
                    </div>

                    {/* Horizontal row lines + bars */}
                    {(() => {
                      let currentRow = 0;
                      const elements: ReactElement[] = [];

                      for (const phase of phases) {
                        // Phase header row
                        const phaseBar = getBarPosition(phase.startDate, phase.endDate);
                        elements.push(
                          <div key={`phase-${phase.id}`}
                            className="absolute w-full border-b border-slate-800/20 bg-slate-800/10"
                            style={{ top: currentRow * ROW_HEIGHT, height: ROW_HEIGHT }}>
                            <div className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-slate-700/30"
                              style={{ left: phaseBar.left, width: phaseBar.width }} />
                          </div>
                        );
                        currentRow++;

                        // Task bars
                        for (const task of phase.tasks) {
                          const bar = getBarPosition(task.startDate, task.endDate);
                          elements.push(
                            <div key={`task-${task.id}`}
                              className="absolute w-full border-b border-slate-800/20"
                              style={{ top: currentRow * ROW_HEIGHT, height: ROW_HEIGHT }}>
                              <div
                                onClick={() => setSelectedTask(task.task)}
                                className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-md cursor-pointer transition-all hover:brightness-125 hover:scale-y-110 ${getStatusBarColor(task.status)}`}
                                style={{ left: bar.left + 2, width: Math.max(bar.width - 4, 8) }}
                                title={`${task.title}\n${task.startDate.toLocaleDateString()} → ${task.endDate.toLocaleDateString()}`}
                              >
                                {bar.width > 60 && (
                                  <span className="absolute inset-0 flex items-center px-2 text-[9px] text-white font-medium truncate">
                                    {task.title}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                          currentRow++;
                        }
                      }

                      return elements;
                    })()}

                    {/* Dependency arrows (SVG overlay) */}
                    <svg className="absolute inset-0 pointer-events-none z-10" style={{ width: timelineWidth, height: totalRows * ROW_HEIGHT }}>
                      {phases.flatMap(phase =>
                        phase.tasks.filter(t => t.dependencies.length > 0).map(task => {
                          const targetRow = taskRowMap.get(task.id);
                          return task.dependencies.map(depId => {
                            const sourceRow = taskRowMap.get(depId);
                            if (targetRow === undefined || sourceRow === undefined) return null;
                            
                            const sourceTask = phases.flatMap(p => p.tasks).find(t => t.id === depId);
                            if (!sourceTask) return null;

                            const sourceBar = getBarPosition(sourceTask.startDate, sourceTask.endDate);
                            const targetBar = getBarPosition(task.startDate, task.endDate);

                            const x1 = sourceBar.left + sourceBar.width;
                            const y1 = sourceRow * ROW_HEIGHT + ROW_HEIGHT / 2;
                            const x2 = targetBar.left;
                            const y2 = targetRow * ROW_HEIGHT + ROW_HEIGHT / 2;

                            const midX = x1 + (x2 - x1) / 2;

                            return (
                              <g key={`dep-${depId}-${task.id}`}>
                                <path
                                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                                  fill="none"
                                  stroke="rgba(99,102,241,0.3)"
                                  strokeWidth="1.5"
                                  strokeDasharray="4 2"
                                />
                                {/* Arrow head */}
                                <polygon
                                  points={`${x2},${y2} ${x2-6},${y2-3} ${x2-6},${y2+3}`}
                                  fill="rgba(99,102,241,0.5)"
                                />
                              </g>
                            );
                          });
                        })
                      )}
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile hint */}
        <div className="lg:hidden mt-3 text-center">
          <p className="text-[10px] text-slate-600">← Scroll horizontally to see the full timeline →</p>
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
