"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { Project, Task, STATUS_CONFIG, PRIORITY_CONFIG } from "@/lib/types";
import { getAllTasks } from "@/lib/utils";
import TaskDetail from "@/components/TaskDetail";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_AR = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

interface DayCell {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: Task[];
}

export default function CalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayCell | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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
  const tasksWithDates = allTasks.filter(t => t.dueDate);

  // Build calendar grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay(); // 0 = Sun
  const daysInMonth = lastDay.getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const getTasksForDate = (date: Date): Task[] => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return tasksWithDates.filter(t => {
      if (!t.dueDate) return false;
      const due = t.dueDate.slice(0, 10);
      return due === dateStr;
    });
  };

  // Build 6-week grid
  const grid: DayCell[] = [];
  // Previous month padding
  const prevMonth = new Date(year, month, 0);
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonth.getDate() - i);
    grid.push({ date: d, isCurrentMonth: false, isToday: false, tasks: getTasksForDate(d) });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    grid.push({ date, isCurrentMonth: true, isToday: dateStr === todayStr, tasks: getTasksForDate(date) });
  }
  // Next month padding to fill 6 rows
  const remaining = 42 - grid.length;
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, month + 1, d);
    grid.push({ date, isCurrentMonth: false, isToday: false, tasks: getTasksForDate(date) });
  }

  const prevMonthNav = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonthNav = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const monthName = currentDate.toLocaleDateString("en", { month: "long", year: "numeric" });

  const getStatusColor = (task: Task) => STATUS_CONFIG[task.status]?.color || "#64748b";
  const getPriorityBorder = (task: Task) => {
    if (task.priority === "critical") return "border-l-rose-500";
    if (task.priority === "high") return "border-l-amber-500";
    return "border-l-slate-600";
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
                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                  Calendar 📅
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/project/${id}/kanban`} className="px-3 py-1.5 text-[11px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-all">
              Kanban ▦
            </Link>
            <Link href={`/project/${id}/gantt`} className="px-3 py-1.5 text-[11px] font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg hover:bg-violet-500/20 transition-all">
              📊
            </Link>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="glass-card rounded-2xl p-4 mb-5 animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonthNav} className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/30 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition-all press">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center">
              <h2 className="text-[16px] font-bold text-white">{monthName}</h2>
              <button onClick={goToday} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium mt-0.5">Today</button>
            </div>
            <button onClick={nextMonthNav} className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/30 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition-all press">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((day, i) => (
              <div key={day} className="text-center py-1">
                <span className="text-[10px] font-semibold text-slate-500 hidden sm:inline">{day}</span>
                <span className="text-[10px] font-semibold text-slate-500 sm:hidden">{day.charAt(0)}</span>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {grid.map((cell, i) => {
              const hasOverdue = cell.tasks.some(t => t.status !== "done" && t.status !== "approved" && new Date(t.dueDate!) < today);
              return (
                <button
                  key={i}
                  onClick={() => cell.tasks.length > 0 ? setSelectedDay(cell) : null}
                  className={`relative aspect-square rounded-lg flex flex-col items-center justify-start pt-1 transition-all ${
                    cell.isToday
                      ? "bg-indigo-500/20 border border-indigo-500/30 ring-1 ring-indigo-500/20"
                      : cell.isCurrentMonth
                        ? "hover:bg-slate-800/40 border border-transparent hover:border-slate-700/30"
                        : "opacity-30"
                  } ${cell.tasks.length > 0 ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span className={`text-[11px] font-medium ${
                    cell.isToday ? "text-indigo-300 font-bold" : cell.isCurrentMonth ? "text-slate-300" : "text-slate-600"
                  }`}>
                    {cell.date.getDate()}
                  </span>
                  
                  {/* Task dots */}
                  {cell.tasks.length > 0 && (
                    <div className="flex flex-wrap gap-[2px] justify-center mt-0.5 px-0.5">
                      {cell.tasks.slice(0, 3).map((task, ti) => (
                        <span
                          key={ti}
                          className="w-[5px] h-[5px] rounded-full flex-shrink-0"
                          style={{ backgroundColor: getStatusColor(task) }}
                          title={task.title}
                        />
                      ))}
                      {cell.tasks.length > 3 && (
                        <span className="text-[7px] text-slate-500 font-bold">+{cell.tasks.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Overdue indicator */}
                  {hasOverdue && (
                    <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-rose-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Task Summary & Upcoming - side by side on desktop */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-5">
        <div className="glass-card rounded-2xl p-4 mb-5 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h3 className="text-[13px] font-semibold text-slate-300 mb-3">📊 Overview</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center bg-slate-900/40 rounded-xl p-3">
              <div className="text-[18px] font-bold text-blue-400">{tasksWithDates.length}</div>
              <div className="text-[10px] text-slate-500">With Dates</div>
            </div>
            <div className="text-center bg-slate-900/40 rounded-xl p-3">
              <div className="text-[18px] font-bold text-rose-400">
                {tasksWithDates.filter(t => t.status !== "done" && t.status !== "approved" && t.dueDate && new Date(t.dueDate) < today).length}
              </div>
              <div className="text-[10px] text-slate-500">Overdue</div>
            </div>
            <div className="text-center bg-slate-900/40 rounded-xl p-3">
              <div className="text-[18px] font-bold text-amber-400">
                {tasksWithDates.filter(t => {
                  if (!t.dueDate || t.status === "done" || t.status === "approved") return false;
                  const due = new Date(t.dueDate);
                  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                  return due >= today && due <= weekFromNow;
                }).length}
              </div>
              <div className="text-[10px] text-slate-500">This Week</div>
            </div>
          </div>
        </div>

        {/* Upcoming Tasks List */}
        <div className="glass-card rounded-2xl p-4 mb-5 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <h3 className="text-[13px] font-semibold text-slate-300 mb-3">📋 Upcoming Tasks</h3>
          <div className="space-y-1">
            {tasksWithDates
              .filter(t => t.status !== "done" && t.status !== "approved")
              .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
              .slice(0, 10)
              .map(task => {
                const isOverdue = new Date(task.dueDate!) < today;
                return (
                  <div key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-slate-800/30 transition-colors cursor-pointer border-l-2 ${getPriorityBorder(task)}`}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-3 h-3 rounded-full border-2 flex-shrink-0" style={{ borderColor: getStatusColor(task) }} />
                      <span className="text-[12px] text-slate-300 truncate">{task.title}</span>
                    </div>
                    <span className={`text-[10px] font-medium flex-shrink-0 ${isOverdue ? "text-rose-400" : "text-slate-500"}`}>
                      {new Date(task.dueDate!).toLocaleDateString("en", { month: "short", day: "numeric" })}
                      {isOverdue && " ⚠️"}
                    </span>
                  </div>
                );
              })}
            {tasksWithDates.filter(t => t.status !== "done" && t.status !== "approved").length === 0 && (
              <p className="text-center text-[11px] text-slate-600 py-4">No upcoming tasks with due dates</p>
            )}
          </div>
        </div>
        </div>{/* end lg:grid wrapper */}

        {/* Day Detail Modal */}
        {selectedDay && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center animate-fade-in" onClick={() => setSelectedDay(null)}>
            <div className="glass-card rounded-t-2xl sm:rounded-2xl max-w-lg w-full max-h-[70vh] overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-slate-800/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-bold text-white">
                    📅 {selectedDay.date.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
                  </h3>
                  <button onClick={() => setSelectedDay(null)} className="text-slate-500 hover:text-slate-300 text-lg">✕</button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{selectedDay.tasks.length} task{selectedDay.tasks.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="overflow-y-auto max-h-[55vh] p-4 space-y-2">
                {selectedDay.tasks.map(task => (
                  <div key={task.id}
                    onClick={() => { setSelectedDay(null); setSelectedTask(task); }}
                    className="glass-card rounded-xl p-3 cursor-pointer hover:bg-white/[0.03] transition-all press">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_CONFIG[task.priority]?.color }} />
                        <span className="text-[12px] font-semibold text-slate-200">{task.title}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ color: getStatusColor(task), background: getStatusColor(task) + "15" }}>
                        {STATUS_CONFIG[task.status]?.labelAr}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-600">
                      {task.assignee && <span>{task.assignee === "employee-1" ? "🔩" : "👤"} {task.assignee}</span>}
                      {task.estimatedHours && <span>⏱ {task.estimatedHours}h</span>}
                      {task.tags?.length > 0 && <span>🏷 {task.tags.slice(0, 2).join(", ")}</span>}
                    </div>
                  </div>
                ))}
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
