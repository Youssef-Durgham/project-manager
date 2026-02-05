"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Project, Task, Activity, TaskStatus, Blocker, Decision, CostEntry, Component as ProjectComponent } from "@/lib/types";
import { getComponentTasks, getCompletionPercent, getTaskStats, getAllTasks } from "@/lib/utils";
import TypeBadge from "@/components/TypeBadge";
import StatusBadge from "@/components/StatusBadge";
import ProgressBar from "@/components/ProgressBar";
import ChatPanel from "@/components/ChatPanel";
import TaskDetail from "@/components/TaskDetail";
import EventToasts from "@/components/EventToasts";
import { useEvents } from "@/lib/useEvents";

const TASK_STATUS_ORDER: TaskStatus[] = ["draft", "ready", "waiting", "in-progress", "review", "revision", "approved", "done"];

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"components" | "chat" | "activity" | "blockers" | "decisions" | "costs" | "insights">("components");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());
  const [showAddPhase, setShowAddPhase] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState<string | null>(null);
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState<string | null>(null);
  const [phaseForm, setPhaseForm] = useState({ name: "", description: "", status: "active" as "active" | "draft" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", startMode: "ready" as "ready" | "draft" });
  const [componentForm, setComponentForm] = useState({ name: "", icon: "📦" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [costs, setCosts] = useState<{ costs: CostEntry[]; summary: any }>({ costs: [], summary: {} });
  const [insights, setInsights] = useState<any>(null);
  const [showAddBlocker, setShowAddBlocker] = useState(false);
  const [showAddDecision, setShowAddDecision] = useState(false);
  const [showAddCost, setShowAddCost] = useState(false);
  const [blockerForm, setBlockerForm] = useState<{ title: string; description: string; type: 'question' | 'blocker' | 'decision-needed'; priority: 'low' | 'medium' | 'high' | 'critical' }>({ title: '', description: '', type: 'question', priority: 'medium' });
  const [decisionForm, setDecisionForm] = useState<{ title: string; description: string; reasoning: string; category: 'architecture' | 'tech-stack' | 'design' | 'process' | 'business' | 'other'; impact: 'low' | 'medium' | 'high' }>({ title: '', description: '', reasoning: '', category: 'other', impact: 'medium' });
  const [costForm, setCostForm] = useState<{ service: string; amount: string; category: 'aws' | 'api' | 'hosting' | 'domain' | 'database' | 'storage' | 'ai' | 'other'; period: 'one-time' | 'monthly' | 'yearly'; notes: string }>({ service: '', amount: '', category: 'aws', period: 'monthly', notes: '' });
  const [openBlockerCount, setOpenBlockerCount] = useState(0);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Real-time SSE updates
  const refreshProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      const result = await res.json();
      if (result.data || result) setProject(result.data || result);
    } catch {}
  };

  const { toasts, dismissToast } = useEvents({
    projectId: project?._id || id,
    onTaskUpdated: () => refreshProject(),
    onProjectUpdated: () => refreshProject(),
    onCommentAdded: () => {
      fetch(`/api/comments?projectId=${id}`)
        .then(r => r.json())
        .then(d => { if (d.success) setCommentCount(d.data.length); })
        .catch(() => {});
    },
    onBlockerChanged: () => {
      if (activeTab === 'blockers') loadBlockers();
    },
  });

  const toggleBulkSelect = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  };

  const bulkAction = async (updates: Record<string, any>) => {
    if (selectedTaskIds.size === 0) return;
    const res = await fetch(`/api/projects/${id}/bulk`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskIds: [...selectedTaskIds], updates }),
    });
    if (res.ok) {
      const r = await res.json();
      setProject(r.data || r);
    }
    setSelectedTaskIds(new Set());
    setBulkMode(false);
  };

  const togglePin = async (taskId: string, currentPinned: boolean) => {
    const res = await fetch(`/api/projects/${id}/task/${taskId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !currentPinned }),
    });
    if (res.ok) {
      const r = await res.json();
      setProject(r.data || r);
    }
  };

  const toggleTimer = async (taskId: string, isActive: boolean) => {
    const res = await fetch(`/api/projects/${id}/task/${taskId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timerAction: isActive ? 'stop' : 'start' }),
    });
    if (res.ok) {
      const r = await res.json();
      setProject(r.data || r);
    }
  };

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => r.json())
      .then(result => {
        const data = result.data || result;
        setProject(data);
        setExpandedComponents(new Set((data.components || []).map((c: ProjectComponent) => c.id)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
    
    fetch(`/api/comments?projectId=${id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setCommentCount(d.data.length); })
      .catch(() => {});
  }, [id]);

  const loadBlockers = async () => {
    try {
      const pid = project?._id || id;
      const res = await fetch(`/api/blockers?projectId=${pid}`);
      const data = await res.json();
      setBlockers(data);
      setOpenBlockerCount(data.filter((b: Blocker) => b.status === 'open').length);
    } catch {}
  };

  const loadDecisions = async () => {
    try {
      const pid = project?._id || id;
      const res = await fetch(`/api/decisions?projectId=${pid}`);
      const data = await res.json();
      setDecisions(data);
    } catch {}
  };

  const loadCosts = async () => {
    try {
      const pid = project?._id || id;
      const res = await fetch(`/api/costs?projectId=${pid}`);
      const data = await res.json();
      setCosts(data);
    } catch {}
  };

  const loadInsights = async () => {
    try {
      const pid = project?._id || id;
      const res = await fetch(`/api/insights?projectId=${pid}`);
      const data = await res.json();
      setInsights(data);
    } catch {}
  };

  const addBlocker = async () => {
    if (!blockerForm.title.trim()) return;
    const pid = project?._id || id;
    await fetch('/api/blockers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...blockerForm, projectId: pid, author: 'yusif' }),
    });
    setShowAddBlocker(false);
    setBlockerForm({ title: '', description: '', type: 'question', priority: 'medium' });
    loadBlockers();
  };

  const resolveBlocker = async (blockerId: string, resolution: string) => {
    await fetch('/api/blockers', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: blockerId, status: 'resolved', resolution, resolvedBy: 'yusif' }),
    });
    loadBlockers();
  };

  const addDecision = async () => {
    if (!decisionForm.title.trim()) return;
    const pid = project?._id || id;
    await fetch('/api/decisions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...decisionForm, projectId: pid, madeBy: 'yusif' }),
    });
    setShowAddDecision(false);
    setDecisionForm({ title: '', description: '', reasoning: '', category: 'other', impact: 'medium' });
    loadDecisions();
  };

  const addCost = async () => {
    if (!costForm.service.trim() || !costForm.amount) return;
    const pid = project?._id || id;
    await fetch('/api/costs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...costForm, amount: parseFloat(costForm.amount), projectId: pid, addedBy: 'yusif' }),
    });
    setShowAddCost(false);
    setCostForm({ service: '', amount: '', category: 'aws', period: 'monthly', notes: '' });
    loadCosts();
  };

  const deleteCost = async (costId: string) => {
    await fetch(`/api/costs?id=${costId}`, { method: 'DELETE' });
    loadCosts();
  };

  const loadActivities = async () => {
    try {
      const p = project?._id || id;
      const res = await fetch(`/api/activity?projectId=${p}&limit=50`);
      const data = await res.json();
      if (data.success) setActivities(data.data);
    } catch {}
  };

  const toggleComponent = (compId: string) => {
    setExpandedComponents(prev => {
      const next = new Set(prev);
      next.has(compId) ? next.delete(compId) : next.add(compId);
      return next;
    });
  };

  const setTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    const res = await fetch(`/api/projects/${id}/task/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const result = await res.json();
      setProject(result.data || result);
    }
    setShowStatusMenu(null);
  };

  const addPhase = async (componentId: string) => {
    if (!phaseForm.name.trim()) return;
    const res = await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-phase", componentId, name: phaseForm.name, description: phaseForm.description, status: phaseForm.status }),
    });
    if (res.ok) { const r = await res.json(); setProject(r.data || r); }
    setShowAddPhase(null);
    setPhaseForm({ name: "", description: "", status: "active" });
  };

  const addTask = async (phaseId: string) => {
    if (!taskForm.title.trim()) return;
    const status = taskForm.startMode === "draft" ? "draft" : "ready";
    const res = await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-task", phaseId, title: taskForm.title, description: taskForm.description, status }),
    });
    if (res.ok) { const r = await res.json(); setProject(r.data || r); }
    setShowAddTask(null);
    setTaskForm({ title: "", description: "", startMode: "ready" });
  };

  const addComponent = async () => {
    if (!componentForm.name.trim()) return;
    const res = await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-component", name: componentForm.name, icon: componentForm.icon }),
    });
    if (res.ok) {
      const r = await res.json();
      const d = r.data || r;
      setProject(d);
      setExpandedComponents(prev => {
        const next = new Set(prev);
        d.components.forEach((c: ProjectComponent) => next.add(c.id));
        return next;
      });
    }
    setShowAddComponent(false);
    setComponentForm({ name: "", icon: "📦" });
  };

  const deleteProject = async () => {
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gradient-mesh">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gradient-mesh">
        <div className="text-5xl mb-4 animate-float">🚫</div>
        <h2 className="text-lg font-semibold text-slate-300">Project not found</h2>
        <Link href="/" className="mt-4 text-indigo-400 text-sm hover:underline">← Back to projects</Link>
      </div>
    );
  }

  const allTasks = getAllTasks(project);
  const overallPercent = getCompletionPercent(allTasks);
  const overallStats = getTaskStats(allTasks);

  return (
    <div className="min-h-screen gradient-mesh noise-bg">
      <div className="max-w-lg lg:max-w-6xl mx-auto px-5 lg:px-8 pt-5 pb-28">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-5 animate-fade-in">
          <Link href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-200 transition-colors text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/project/${id}/kanban`} className="px-3 py-1.5 text-[11px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-all">
              Kanban ▦
            </Link>
            <Link href={`/project/${id}/calendar`} className="px-3 py-1.5 text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-all">
              📅
            </Link>
            <Link href={`/project/${id}/gantt`} className="px-3 py-1.5 text-[11px] font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg hover:bg-violet-500/20 transition-all">
              📊
            </Link>
            <Link href={`/project/${id}/edit`} className="px-3 py-1.5 text-[11px] font-medium text-slate-400 bg-slate-800/60 border border-slate-700/30 rounded-lg hover:bg-slate-700/60 hover:text-slate-200 transition-all">
              Edit
            </Link>
            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/demo/${id}`); alert('Demo link copied!'); }}
              className="px-3 py-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all">
              Share 🔗
            </button>
            <div className="relative group">
              <button className="px-3 py-1.5 text-[11px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-all">
                Export 📥
              </button>
              <div className="absolute right-0 top-full mt-1 glass-card rounded-xl shadow-2xl shadow-black/40 py-1 min-w-[140px] hidden group-hover:block z-50 animate-scale-in">
                <a href={`/api/projects/${id}/export?format=json`} download
                  className="block w-full text-left px-3 py-2 text-[12px] text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 transition-colors">
                  📋 JSON Export
                </a>
                <a href={`/api/projects/${id}/export?format=csv`} download
                  className="block w-full text-left px-3 py-2 text-[12px] text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 transition-colors">
                  📊 CSV Export
                </a>
              </div>
            </div>
            <button onClick={() => setShowDeleteConfirm(true)} className="px-3 py-1.5 text-[11px] font-medium text-rose-400/80 bg-slate-800/60 border border-slate-700/30 rounded-lg hover:bg-rose-950/40 hover:text-rose-300 transition-all">
              Delete
            </button>
          </div>
        </div>

        {/* Project Header */}
        <div className="mb-5 animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <div className="flex items-start justify-between gap-3 mb-2">
            <h1 className="text-[24px] font-bold text-white tracking-tight">{project.name}</h1>
            <TypeBadge type={project.type} />
          </div>
          <p className="text-[13px] text-slate-500 leading-relaxed mb-4">{project.description}</p>

          {/* Tech Stack */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {(project.techStack || []).map(tech => (
              <span key={tech} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 font-medium border border-slate-700/30">
                {tech}
              </span>
            ))}
          </div>

          {/* Overall Progress Card */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[13px] font-semibold text-slate-300">Overall Progress</span>
              <span className={`text-[15px] font-bold ${overallPercent >= 80 ? 'text-emerald-400' : overallPercent >= 50 ? 'text-blue-400' : 'text-amber-400'}`}>
                {overallPercent}%
              </span>
            </div>
            <ProgressBar value={overallPercent} size="lg" animated />
            <div className="grid grid-cols-5 gap-2 lg:gap-4 mt-3">
              {[
                { label: "Done", value: overallStats.done, color: "text-emerald-400", dot: "bg-emerald-400" },
                { label: "Active", value: overallStats.inProgress, color: "text-violet-400", dot: "bg-violet-400" },
                { label: "Review", value: overallStats.review, color: "text-orange-400", dot: "bg-orange-400" },
                { label: "Ready", value: overallStats.ready, color: "text-blue-400", dot: "bg-blue-400" },
                { label: "Waiting", value: overallStats.waiting, color: "text-amber-400", dot: "bg-amber-400" },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <div className={`text-[15px] font-bold ${item.color}`}>{item.value}</div>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <span className={`w-1 h-1 rounded-full ${item.dot}`} />
                    <span className="text-[10px] text-slate-600 font-medium">{item.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Bar - Scrollable */}
        <div className="mb-5 glass-card rounded-xl p-1 animate-fade-in overflow-x-auto scrollbar-hide" style={{ animationDelay: "0.1s" }}>
          <div className="flex gap-1 min-w-max">
            {[
              { key: "components" as const, icon: "📂", label: "Tasks", load: () => {} },
              { key: "chat" as const, icon: "💬", label: "Chat", load: () => {} },
              { key: "blockers" as const, icon: "🚫", label: "Blockers", load: loadBlockers },
              { key: "decisions" as const, icon: "⚖️", label: "Decisions", load: loadDecisions },
              { key: "costs" as const, icon: "💰", label: "Costs", load: loadCosts },
              { key: "insights" as const, icon: "📊", label: "Insights", load: loadInsights },
              { key: "activity" as const, icon: "📋", label: "Log", load: loadActivities },
            ].map(tab => (
              <button key={tab.key}
                onClick={() => { setActiveTab(tab.key); tab.load(); }}
                className={`px-4 py-2.5 text-[11px] font-semibold rounded-lg transition-all duration-200 relative whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-indigo-500/20 text-indigo-300 shadow-sm border border-indigo-500/20"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab.icon} {tab.label}
                {tab.key === "chat" && commentCount > 0 && activeTab !== "chat" && (
                  <span className="absolute -top-1.5 -right-1 min-w-[18px] h-[18px] bg-indigo-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg shadow-indigo-500/30">
                    {commentCount > 99 ? '99+' : commentCount}
                  </span>
                )}
                {tab.key === "blockers" && openBlockerCount > 0 && activeTab !== "blockers" && (
                  <span className="absolute -top-1.5 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg shadow-rose-500/30">
                    {openBlockerCount}
                  </span>
                )}
              </button>
            ))}
            <Link href={`/project/${id}/sprints`}
              className="px-4 py-2.5 text-[11px] font-semibold rounded-lg transition-all duration-200 whitespace-nowrap text-cyan-500 hover:text-cyan-300 hover:bg-cyan-500/10">
              🏃 Sprints
            </Link>
            <Link href={`/project/${id}/time`}
              className="px-4 py-2.5 text-[11px] font-semibold rounded-lg transition-all duration-200 whitespace-nowrap text-emerald-500 hover:text-emerald-300 hover:bg-emerald-500/10">
              ⏱ Time
            </Link>
          </div>
        </div>

        {/* Chat Tab */}
        {activeTab === "chat" && (
          <div className="animate-fade-in">
            <ChatPanel projectId={project._id || id} />
          </div>
        )}

        {/* Components Tab */}
        {activeTab === "components" && (
          <div className="space-y-3 stagger">
            {/* Bulk Action Bar */}
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => { setBulkMode(!bulkMode); setSelectedTaskIds(new Set()); }}
                className={`text-[11px] px-3 py-1.5 rounded-lg border font-medium transition-all ${bulkMode ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'text-slate-500 border-slate-700/30 hover:text-slate-300'}`}>
                {bulkMode ? `✓ ${selectedTaskIds.size} selected` : '☐ Bulk'}
              </button>
              {bulkMode && selectedTaskIds.size > 0 && (
                <>
                  <button onClick={() => bulkAction({ status: 'in-progress' })} className="text-[10px] px-2 py-1 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">→ In Progress</button>
                  <button onClick={() => bulkAction({ status: 'done' })} className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">→ Done</button>
                  <button onClick={() => bulkAction({ pinned: true })} className="text-[10px] px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">⭐ Pin</button>
                </>
              )}
            </div>
            {(project.components || []).map(comp => {
              const compTasks = getComponentTasks(comp);
              const compPercent = getCompletionPercent(compTasks);
              const compStats = getTaskStats(compTasks);
              const isExpanded = expandedComponents.has(comp.id);

              return (
                <div key={comp.id} className="glass-card rounded-2xl overflow-hidden">
                  {/* Component Header */}
                  <button
                    onClick={() => toggleComponent(comp.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/30 flex items-center justify-center text-xl">
                        {comp.icon}
                      </div>
                      <div className="text-left">
                        <h3 className="text-[14px] font-semibold text-slate-200">{comp.name}</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {comp.phases.length} phase{comp.phases.length !== 1 ? 's' : ''} · {compStats.done}/{compTasks.length} tasks
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[12px] font-bold ${compPercent >= 80 ? 'text-emerald-400' : compPercent >= 50 ? 'text-blue-400' : 'text-slate-500'}`}>
                        {compPercent}%
                      </span>
                      <svg className={`w-4 h-4 text-slate-600 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  <div className="px-4 pb-1">
                    <ProgressBar value={compPercent} size="sm" />
                  </div>

                  {/* Environment Links */}
                  {comp.environments && comp.environments.length > 0 && (
                    <div className="px-4 pb-1 flex flex-wrap gap-1.5">
                      {comp.environments.filter(e => e.enabled).map(env => (
                        <a key={env.name} href={env.url || '#'} target="_blank" rel="noopener noreferrer"
                          className={`text-[9px] px-2 py-[3px] rounded-md font-semibold uppercase tracking-wider border transition-all ${
                            env.name === 'prod' || env.name === 'production' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' :
                            env.name === 'dev' || env.name === 'development' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20' :
                            env.name === 'test' || env.name === 'testing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' :
                            'bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20'
                          } ${env.url ? 'cursor-pointer' : 'cursor-default opacity-60'}`}>
                          {env.name}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-3 space-y-3 animate-fade-in">
                      {(comp.phases || []).map(phase => {
                        const phasePercent = getCompletionPercent(phase.tasks);
                        return (
                          <div key={phase.id} className={`bg-slate-900/40 border rounded-xl p-3.5 ${phase.status === 'draft' ? 'border-slate-800/30 opacity-60' : 'border-slate-800/50'}`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <h4 className="text-[13px] font-semibold text-slate-300 flex items-center gap-2">
                                <span className="text-[11px] text-slate-600 font-mono">#{phase.order}</span>
                                {phase.name}
                                {phase.status === 'draft' && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-700/40 text-slate-500 border border-slate-600/20 font-semibold uppercase tracking-wider">Draft</span>
                                )}
                              </h4>
                              <span className={`text-[11px] font-bold ${phasePercent >= 80 ? 'text-emerald-400/70' : 'text-slate-600'}`}>
                                {phasePercent}%
                              </span>
                            </div>
                            {phase.description && (
                              <p className="text-[11px] text-slate-600 mb-2">{phase.description}</p>
                            )}
                            <ProgressBar value={phasePercent} />

                            {/* Tasks */}
                            <div className="mt-3 space-y-0.5">
                              {[...(phase.tasks || [])].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).map(task => (
                                <div key={task.id} className={`flex items-center justify-between gap-2 py-2 px-2.5 rounded-lg hover:bg-slate-800/30 transition-colors group relative cursor-pointer ${task.pinned ? 'bg-amber-500/[0.03] border-l-2 border-amber-500/30' : ''} ${selectedTaskIds.has(task.id) ? 'bg-indigo-500/10' : ''}`}
                                  onClick={() => bulkMode ? toggleBulkSelect(task.id) : setSelectedTask(task)}>
                                  <div className="flex-1 min-w-0 flex items-center gap-2">
                                    {(task.status === 'done' || task.status === 'approved') ? (
                                      <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                    ) : task.status === 'draft' ? (
                                      <div className="w-4 h-4 rounded flex-shrink-0 border-2 border-dashed border-slate-600 flex items-center justify-center">
                                        <div className="w-1 h-1 rounded-full bg-slate-600" />
                                      </div>
                                    ) : task.status === 'review' ? (
                                      <div className="w-4 h-4 rounded-full border-2 border-orange-400 flex-shrink-0 flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                                      </div>
                                    ) : task.status === 'revision' ? (
                                      <div className="w-4 h-4 rounded-full border-2 border-rose-400 flex-shrink-0" />
                                    ) : (
                                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                                        task.status === 'in-progress' ? 'border-violet-400' :
                                        task.status === 'ready' ? 'border-blue-400' : 'border-slate-600'
                                      }`} />
                                    )}
                                    {bulkMode && (
                                      <span className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center text-[10px] ${selectedTaskIds.has(task.id) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-600'}`}>
                                        {selectedTaskIds.has(task.id) && '✓'}
                                      </span>
                                    )}
                                    <span className={`text-[13px] ${(task.status === "done" || task.status === "approved") ? "text-slate-600 line-through" : task.status === "draft" ? "text-slate-500 italic" : "text-slate-300"}`}>
                                      {task.title}
                                    </span>
                                    {task.pinned && <span className="text-[10px] text-amber-400 flex-shrink-0" title="Pinned" onClick={e => { e.stopPropagation(); togglePin(task.id, true); }}>⭐</span>}
                                    {task.timerActive && <span className="text-[10px] text-emerald-400 animate-pulse flex-shrink-0">⏱️</span>}
                                    {(task.priority === 'high' || task.priority === 'critical') && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" />}
                                    {task.description && <span className="hidden lg:inline text-[11px] text-slate-600 truncate max-w-[200px] xl:max-w-[300px]">— {task.description}</span>}
                                    {task.assignee && <span className="hidden lg:inline text-[10px] text-slate-500 flex-shrink-0">{task.assignee === 'employee-1' ? '🔩' : '👤'}</span>}
                                    {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
                                      <span className="text-[9px] text-slate-600">
                                        ✓{task.acceptanceCriteria.filter(c => c.checked).length}/{task.acceptanceCriteria.length}
                                      </span>
                                    )}
                                    {task.dependencies && task.dependencies.length > 0 && (
                                      <span className="text-[9px] text-amber-500/60">🔗</span>
                                    )}
                                    {task.recurring?.enabled && (
                                      <span className="text-[9px] text-cyan-400/60" title={`Recurring: ${task.recurring.frequency}`}>🔄</span>
                                    )}
                                  </div>
                                  <div className="relative">
                                    <StatusBadge
                                      status={task.status}
                                      onClick={() => setShowStatusMenu(showStatusMenu === task.id ? null : task.id)}
                                    />
                                    {showStatusMenu === task.id && (
                                      <div className="absolute right-0 top-8 z-50 glass-card rounded-xl shadow-2xl shadow-black/40 py-1 min-w-[150px] animate-scale-in">
                                        {TASK_STATUS_ORDER.map(s => (
                                          <button key={s} onClick={() => setTaskStatus(task.id, s)}
                                            className={`w-full text-left px-3 py-2 text-[12px] hover:bg-white/[0.04] transition-colors flex items-center gap-2 ${
                                              task.status === s ? "text-indigo-400" : "text-slate-400"
                                            }`}>
                                            <StatusBadge status={s} />
                                            {task.status === s && <span className="ml-auto text-indigo-400 text-[10px]">✓</span>}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Add Task */}
                            {showAddTask === phase.id ? (
                              <div className="mt-3 glass-card rounded-xl p-3 animate-scale-in">
                                <input type="text" placeholder="Task title..." value={taskForm.title}
                                  onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                                  className="w-full bg-slate-900/60 border border-slate-700/30 rounded-lg px-3 py-2 text-[13px] text-slate-200 placeholder-slate-600 input-focus mb-2"
                                  autoFocus onKeyDown={e => e.key === "Enter" && addTask(phase.id)} />
                                <input type="text" placeholder="Description (optional)" value={taskForm.description}
                                  onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                                  className="w-full bg-slate-900/60 border border-slate-700/30 rounded-lg px-3 py-2 text-[13px] text-slate-200 placeholder-slate-600 input-focus mb-2" />
                                {/* Start Mode Toggle */}
                                <div className="flex gap-2 mb-3">
                                  <button onClick={() => setTaskForm({ ...taskForm, startMode: "ready" })}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-lg border transition-all ${
                                      taskForm.startMode === "ready"
                                        ? "bg-blue-500/20 text-blue-300 border-blue-500/30 shadow-sm shadow-blue-500/10"
                                        : "text-slate-500 border-slate-700/30 hover:text-slate-300 hover:border-slate-600/50"
                                    }`}>
                                    <span>▶️</span> Start Working
                                  </button>
                                  <button onClick={() => setTaskForm({ ...taskForm, startMode: "draft" })}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-lg border transition-all ${
                                      taskForm.startMode === "draft"
                                        ? "bg-slate-600/20 text-slate-300 border-slate-500/30 shadow-sm shadow-slate-500/10"
                                        : "text-slate-500 border-slate-700/30 hover:text-slate-300 hover:border-slate-600/50"
                                    }`}>
                                    <span>📝</span> Draft
                                  </button>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => addTask(phase.id)}
                                    className={`flex-1 text-[11px] font-semibold py-2 rounded-lg transition-colors border ${
                                      taskForm.startMode === "ready"
                                        ? "bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/20"
                                        : "bg-slate-600/20 hover:bg-slate-600/30 text-slate-300 border-slate-500/20"
                                    }`}>
                                    {taskForm.startMode === "ready" ? "▶️ Add & Start" : "📝 Add as Draft"}
                                  </button>
                                  <button onClick={() => { setShowAddTask(null); setTaskForm({ title: "", description: "", startMode: "ready" }); }}
                                    className="px-3 py-2 text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => setShowAddTask(phase.id)}
                                className="mt-2 w-full py-1.5 text-[11px] text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/5 rounded-lg transition-all font-medium">
                                + Add Task
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {/* Add Phase */}
                      {showAddPhase === comp.id ? (
                        <div className="glass-card rounded-xl p-3 border-dashed animate-scale-in">
                          <input type="text" placeholder="Phase name..." value={phaseForm.name}
                            onChange={e => setPhaseForm({ ...phaseForm, name: e.target.value })}
                            className="w-full bg-slate-900/60 border border-slate-700/30 rounded-lg px-3 py-2 text-[13px] text-slate-200 placeholder-slate-600 input-focus mb-2"
                            autoFocus onKeyDown={e => e.key === "Enter" && addPhase(comp.id)} />
                          <input type="text" placeholder="Description (optional)" value={phaseForm.description}
                            onChange={e => setPhaseForm({ ...phaseForm, description: e.target.value })}
                            className="w-full bg-slate-900/60 border border-slate-700/30 rounded-lg px-3 py-2 text-[13px] text-slate-200 placeholder-slate-600 input-focus mb-2" />
                          {/* Phase Status Toggle */}
                          <div className="flex gap-2 mb-3">
                            <button onClick={() => setPhaseForm({ ...phaseForm, status: "active" })}
                              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-lg border transition-all ${
                                phaseForm.status === "active"
                                  ? "bg-violet-500/20 text-violet-300 border-violet-500/30 shadow-sm shadow-violet-500/10"
                                  : "text-slate-500 border-slate-700/30 hover:text-slate-300 hover:border-slate-600/50"
                              }`}>
                              <span>▶️</span> Active
                            </button>
                            <button onClick={() => setPhaseForm({ ...phaseForm, status: "draft" })}
                              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-lg border transition-all ${
                                phaseForm.status === "draft"
                                  ? "bg-slate-600/20 text-slate-300 border-slate-500/30 shadow-sm shadow-slate-500/10"
                                  : "text-slate-500 border-slate-700/30 hover:text-slate-300 hover:border-slate-600/50"
                              }`}>
                              <span>📝</span> Draft
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => addPhase(comp.id)}
                              className={`flex-1 text-[11px] font-semibold py-2 rounded-lg transition-colors border ${
                                phaseForm.status === "active"
                                  ? "bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border-violet-500/20"
                                  : "bg-slate-600/20 hover:bg-slate-600/30 text-slate-300 border-slate-500/20"
                              }`}>
                              {phaseForm.status === "active" ? "▶️ Add Phase" : "📝 Add as Draft"}
                            </button>
                            <button onClick={() => { setShowAddPhase(null); setPhaseForm({ name: "", description: "", status: "active" }); }} className="px-3 py-2 text-[11px] text-slate-500 hover:text-slate-300 transition-colors">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setShowAddPhase(comp.id)}
                          className="w-full py-2 text-[11px] text-slate-600 hover:text-violet-400 border border-dashed border-slate-800/50 hover:border-violet-500/20 rounded-xl transition-all font-medium">
                          + Add Phase
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Component */}
            {showAddComponent ? (
              <div className="glass-card rounded-2xl p-4 border-dashed animate-scale-in">
                <h4 className="text-[13px] font-semibold text-slate-300 mb-3">New Component</h4>
                <div className="flex gap-2 mb-2">
                  <input type="text" placeholder="🎨" value={componentForm.icon}
                    onChange={e => setComponentForm({ ...componentForm, icon: e.target.value })}
                    className="w-14 bg-slate-900/60 border border-slate-700/30 rounded-lg px-2 py-2 text-center text-lg input-focus" />
                  <input type="text" placeholder="Component name..." value={componentForm.name}
                    onChange={e => setComponentForm({ ...componentForm, name: e.target.value })}
                    className="flex-1 bg-slate-900/60 border border-slate-700/30 rounded-lg px-3 py-2 text-[13px] text-slate-200 placeholder-slate-600 input-focus"
                    autoFocus onKeyDown={e => e.key === "Enter" && addComponent()} />
                </div>
                <div className="flex gap-2">
                  <button onClick={addComponent} className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-semibold py-2 rounded-lg transition-colors border border-emerald-500/20">Add Component</button>
                  <button onClick={() => { setShowAddComponent(false); setComponentForm({ name: "", icon: "📦" }); }} className="px-3 py-2 text-[11px] text-slate-500 hover:text-slate-300 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddComponent(true)}
                className="w-full py-3.5 text-[12px] text-slate-600 hover:text-emerald-400 border-2 border-dashed border-slate-800/40 hover:border-emerald-500/20 rounded-2xl transition-all font-medium">
                + Add Component
              </button>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <div className="animate-fade-in space-y-2">
            {activities.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3 animate-float">📋</div>
                <p className="text-[13px] text-slate-400 font-medium">No activity yet</p>
                <p className="text-[11px] text-slate-600 mt-1">Changes will be logged here automatically</p>
              </div>
            ) : (
              activities.map((act, i) => (
                <div key={act._id || i} className="flex gap-3 py-2.5 px-3 rounded-lg hover:bg-slate-800/20 transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[12px] ${
                      act.actor === 'employee-1' ? 'bg-indigo-500/10 border border-indigo-500/20' :
                      act.actor === 'system' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                      'bg-blue-500/10 border border-blue-500/20'
                    }`}>
                      {act.actor === 'employee-1' ? '🔩' : act.actor === 'system' ? '⚡' : '👤'}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-slate-300 leading-relaxed">{act.details}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-600">{act.actor}</span>
                      <span className="text-[10px] text-slate-700">·</span>
                      <span className="text-[10px] text-slate-600">
                        {act.createdAt ? new Date(act.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Blockers Tab */}
        {activeTab === "blockers" && (
          <div className="animate-fade-in space-y-3">
            {/* Add Blocker Button */}
            {showAddBlocker ? (
              <div className="glass-card rounded-2xl p-4 animate-scale-in">
                <h4 className="text-[13px] font-semibold text-slate-300 mb-3">🚫 New Blocker / Question</h4>
                <input type="text" placeholder="What's blocking you?" value={blockerForm.title}
                  onChange={e => setBlockerForm({ ...blockerForm, title: e.target.value })}
                  className="w-full bg-slate-900/60 border border-slate-700/30 rounded-lg px-3 py-2 text-[13px] text-slate-200 placeholder-slate-600 input-focus mb-2" autoFocus />
                <textarea placeholder="Details..." value={blockerForm.description}
                  onChange={e => setBlockerForm({ ...blockerForm, description: e.target.value })}
                  className="w-full bg-slate-900/60 border border-slate-700/30 rounded-lg px-3 py-2 text-[13px] text-slate-200 placeholder-slate-600 input-focus mb-2 resize-none" rows={2} />
                <div className="flex gap-2 mb-3">
                  {(['question', 'blocker', 'decision-needed'] as const).map(t => (
                    <button key={t} onClick={() => setBlockerForm({ ...blockerForm, type: t })}
                      className={`px-3 py-1.5 text-[11px] rounded-lg border transition-all font-medium ${blockerForm.type === t ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'text-slate-500 border-slate-700/30 hover:text-slate-300'}`}>
                      {t === 'question' ? '❓ Question' : t === 'blocker' ? '🚫 Blocker' : '⚖️ Decision'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mb-3">
                  {(['low', 'medium', 'high', 'critical'] as const).map(p => (
                    <button key={p} onClick={() => setBlockerForm({ ...blockerForm, priority: p })}
                      className={`px-3 py-1.5 text-[11px] rounded-lg border transition-all font-medium capitalize ${blockerForm.priority === p ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'text-slate-500 border-slate-700/30 hover:text-slate-300'}`}>
                      {p}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={addBlocker} className="flex-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[12px] font-semibold py-2.5 rounded-lg transition-colors border border-indigo-500/20">Submit</button>
                  <button onClick={() => setShowAddBlocker(false)} className="px-4 py-2.5 text-[12px] text-slate-500 hover:text-slate-300">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setShowAddBlocker(true); loadBlockers(); }}
                className="w-full py-3 text-[12px] text-slate-500 hover:text-rose-400 border border-dashed border-slate-800/50 hover:border-rose-500/20 rounded-2xl transition-all font-medium">
                + Add Blocker / Question
              </button>
            )}

            {/* Blocker List */}
            {blockers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-[13px] text-slate-400 font-medium">No blockers!</p>
                <p className="text-[11px] text-slate-600 mt-1">Everything is running smoothly</p>
              </div>
            ) : (
              blockers.map(b => (
                <div key={b._id} className={`glass-card rounded-2xl p-4 ${b.status === 'resolved' ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{b.type === 'question' ? '❓' : b.type === 'blocker' ? '🚫' : '⚖️'}</span>
                      <h4 className={`text-[13px] font-semibold ${b.status === 'resolved' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{b.title}</h4>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      b.status === 'open' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>{b.status}</span>
                  </div>
                  {b.description && <p className="text-[12px] text-slate-400 mb-2">{b.description}</p>}
                  <div className="flex items-center gap-3 text-[10px] text-slate-600">
                    <span>{b.author}</span>
                    <span>·</span>
                    <span className={`capitalize font-semibold ${b.priority === 'critical' ? 'text-rose-400' : b.priority === 'high' ? 'text-amber-400' : ''}`}>{b.priority}</span>
                    <span>·</span>
                    <span>{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ''}</span>
                  </div>
                  {b.resolution && <div className="mt-2 p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-[11px] text-emerald-400">✅ {b.resolution}</div>}
                  {b.status === 'open' && (
                    <button onClick={() => {
                      const res = prompt('Resolution:');
                      if (res) resolveBlocker(b._id!, res);
                    }} className="mt-2 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium">Mark Resolved →</button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Decisions Tab */}
        {activeTab === "decisions" && (
          <div className="animate-fade-in space-y-3">
            {showAddDecision ? (
              <div className="glass-card rounded-2xl p-4 animate-scale-in">
                <h4 className="text-[13px] font-semibold text-slate-300 mb-3">⚖️ Log Decision</h4>
                <input type="text" placeholder="What was decided?" value={decisionForm.title}
                  onChange={e => setDecisionForm({ ...decisionForm, title: e.target.value })}
                  className="w-full bg-slate-900/60 border border-slate-700/30 rounded-lg px-3 py-2 text-[13px] text-slate-200 placeholder-slate-600 input-focus mb-2" autoFocus />
                <textarea placeholder="Description..." value={decisionForm.description}
                  onChange={e => setDecisionForm({ ...decisionForm, description: e.target.value })}
                  className="w-full bg-slate-900/60 border border-slate-700/30 rounded-lg px-3 py-2 text-[13px] text-slate-200 placeholder-slate-600 input-focus mb-2 resize-none" rows={2} />
                <textarea placeholder="Why this decision? (reasoning)" value={decisionForm.reasoning}
                  onChange={e => setDecisionForm({ ...decisionForm, reasoning: e.target.value })}
                  className="w-full bg-slate-900/60 border border-slate-700/30 rounded-lg px-3 py-2 text-[13px] text-slate-200 placeholder-slate-600 input-focus mb-2 resize-none" rows={2} />
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(['architecture', 'tech-stack', 'design', 'process', 'business', 'other'] as const).map(c => (
                    <button key={c} onClick={() => setDecisionForm({ ...decisionForm, category: c })}
                      className={`px-2.5 py-1 text-[10px] rounded-lg border transition-all font-medium capitalize ${decisionForm.category === c ? 'bg-violet-500/20 text-violet-300 border-violet-500/30' : 'text-slate-500 border-slate-700/30 hover:text-slate-300'}`}>
                      {c}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={addDecision} className="flex-1 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-[12px] font-semibold py-2.5 rounded-lg transition-colors border border-violet-500/20">Log Decision</button>
                  <button onClick={() => setShowAddDecision(false)} className="px-4 py-2.5 text-[12px] text-slate-500 hover:text-slate-300">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setShowAddDecision(true); loadDecisions(); }}
                className="w-full py-3 text-[12px] text-slate-500 hover:text-violet-400 border border-dashed border-slate-800/50 hover:border-violet-500/20 rounded-2xl transition-all font-medium">
                + Log Decision
              </button>
            )}

            {decisions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">⚖️</div>
                <p className="text-[13px] text-slate-400 font-medium">No decisions logged yet</p>
                <p className="text-[11px] text-slate-600 mt-1">Document important decisions here</p>
              </div>
            ) : (
              decisions.map(d => (
                <div key={d._id} className="glass-card rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-[13px] font-semibold text-slate-200">{d.title}</h4>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                      d.impact === 'high' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      d.impact === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    }`}>{d.impact} impact</span>
                  </div>
                  {d.description && <p className="text-[12px] text-slate-400 mb-2">{d.description}</p>}
                  {d.reasoning && (
                    <div className="mb-2 p-2 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
                      <span className="text-[10px] text-indigo-400 font-semibold">Why: </span>
                      <span className="text-[11px] text-slate-400">{d.reasoning}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-slate-600">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-500 font-medium capitalize">{d.category}</span>
                    <span>by {d.madeBy}</span>
                    <span>·</span>
                    <span>{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : ''}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Costs Tab */}
        {activeTab === "costs" && (
          <div className="animate-fade-in space-y-3">
            {/* Summary Card */}
            {costs.summary?.monthlyTotal !== undefined && (
              <div className="glass-card rounded-2xl p-4">
                <h4 className="text-[13px] font-semibold text-slate-300 mb-3">💰 Cost Summary</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="text-[18px] font-bold text-emerald-400">${costs.summary.monthlyTotal?.toFixed(0) || 0}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Monthly</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[18px] font-bold text-blue-400">${costs.summary.yearlyTotal?.toFixed(0) || 0}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Yearly</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[18px] font-bold text-amber-400">${costs.summary.oneTimeTotal?.toFixed(0) || 0}</div>
                    <div className="text-[10px] text-slate-500 font-medium">One-Time</div>
                  </div>
                </div>
              </div>
            )}

            {showAddCost ? (
              <div className="glass-card rounded-2xl p-4 animate-scale-in">
                <h4 className="text-[13px] font-semibold text-slate-300 mb-3">💰 Add Cost</h4>
                <input type="text" placeholder="Service name (e.g. MongoDB Atlas)" value={costForm.service}
                  onChange={e => setCostForm({ ...costForm, service: e.target.value })}
                  className="w-full bg-slate-900/60 border border-slate-700/30 rounded-lg px-3 py-2 text-[13px] text-slate-200 placeholder-slate-600 input-focus mb-2" autoFocus />
                <input type="number" placeholder="Amount (USD)" value={costForm.amount}
                  onChange={e => setCostForm({ ...costForm, amount: e.target.value })}
                  className="w-full bg-slate-900/60 border border-slate-700/30 rounded-lg px-3 py-2 text-[13px] text-slate-200 placeholder-slate-600 input-focus mb-2" />
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(['aws', 'api', 'hosting', 'domain', 'database', 'storage', 'ai', 'other'] as const).map(c => (
                    <button key={c} onClick={() => setCostForm({ ...costForm, category: c })}
                      className={`px-2 py-1 text-[10px] rounded-lg border transition-all font-medium uppercase ${costForm.category === c ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'text-slate-500 border-slate-700/30'}`}>
                      {c}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(['one-time', 'monthly', 'yearly'] as const).map(p => (
                    <button key={p} onClick={() => setCostForm({ ...costForm, period: p })}
                      className={`px-3 py-1 text-[10px] rounded-lg border transition-all font-medium capitalize ${costForm.period === p ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'text-slate-500 border-slate-700/30'}`}>
                      {p}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={addCost} className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[12px] font-semibold py-2.5 rounded-lg transition-colors border border-emerald-500/20">Add Cost</button>
                  <button onClick={() => setShowAddCost(false)} className="px-4 py-2.5 text-[12px] text-slate-500 hover:text-slate-300">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setShowAddCost(true); loadCosts(); }}
                className="w-full py-3 text-[12px] text-slate-500 hover:text-emerald-400 border border-dashed border-slate-800/50 hover:border-emerald-500/20 rounded-2xl transition-all font-medium">
                + Add Cost Entry
              </button>
            )}

            {costs.costs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">💰</div>
                <p className="text-[13px] text-slate-400 font-medium">No costs tracked yet</p>
                <p className="text-[11px] text-slate-600 mt-1">Track AWS, API, and hosting costs</p>
              </div>
            ) : (
              costs.costs.map((c: any) => (
                <div key={c._id} className="glass-card rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-[13px] font-semibold text-slate-200">{c.service}</h4>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800/60 font-medium uppercase">{c.category}</span>
                      <span className="capitalize">{c.period}</span>
                      {c.isEstimate && <span className="text-amber-400">(estimate)</span>}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <div className="text-[16px] font-bold text-emerald-400">${c.amount}</div>
                      <div className="text-[10px] text-slate-600">/{c.period === 'one-time' ? 'once' : c.period === 'monthly' ? 'mo' : 'yr'}</div>
                    </div>
                    <button onClick={() => deleteCost(c._id)} className="text-slate-600 hover:text-rose-400 transition-colors text-[14px]">×</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === "insights" && (
          <div className="animate-fade-in space-y-3">
            {!insights ? (
              <div className="text-center py-16">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-[12px] text-slate-500 mt-3">Loading insights...</p>
              </div>
            ) : (
              <>
                {/* Velocity Card */}
                <div className="glass-card rounded-2xl p-4">
                  <h4 className="text-[13px] font-semibold text-slate-300 mb-3">🚀 Velocity</h4>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center">
                      <div className="text-[22px] font-bold text-indigo-400">{insights.velocity?.thisWeek || 0}</div>
                      <div className="text-[10px] text-slate-500">This Week</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[22px] font-bold text-slate-400">{insights.velocity?.lastWeek || 0}</div>
                      <div className="text-[10px] text-slate-500">Last Week</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-[22px] font-bold ${insights.velocity?.trend === 'up' ? 'text-emerald-400' : insights.velocity?.trend === 'down' ? 'text-rose-400' : 'text-slate-400'}`}>
                        {insights.velocity?.trend === 'up' ? '📈' : insights.velocity?.trend === 'down' ? '📉' : '➡️'}
                      </div>
                      <div className="text-[10px] text-slate-500">Trend</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 text-center">
                    Avg {insights.velocity?.avgPerDay?.toFixed(1) || 0} tasks/day
                  </div>
                </div>

                {/* Totals Card */}
                <div className="glass-card rounded-2xl p-4">
                  <h4 className="text-[13px] font-semibold text-slate-300 mb-3">📊 Overview</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Total Tasks', value: insights.totals?.totalTasks, color: 'text-slate-200' },
                      { label: 'Completed', value: insights.totals?.doneTasks, color: 'text-emerald-400' },
                      { label: 'In Progress', value: insights.totals?.inProgressTasks, color: 'text-violet-400' },
                      { label: 'In Review', value: insights.totals?.reviewTasks, color: 'text-orange-400' },
                      { label: 'Remaining', value: insights.totals?.remainingTasks, color: 'text-amber-400' },
                      { label: 'Est. Days Left', value: insights.estimates?.estimatedDaysToComplete || '∞', color: 'text-blue-400' },
                    ].map(item => (
                      <div key={item.label} className="bg-slate-900/40 rounded-xl p-3 text-center">
                        <div className={`text-[18px] font-bold ${item.color}`}>{item.value}</div>
                        <div className="text-[10px] text-slate-600 font-medium mt-0.5">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Estimation Accuracy */}
                <div className="glass-card rounded-2xl p-4">
                  <h4 className="text-[13px] font-semibold text-slate-300 mb-3">⏱️ Time Insights</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/40 rounded-xl p-3 text-center">
                      <div className="text-[18px] font-bold text-cyan-400">{insights.estimates?.avgAccuracy || 0}%</div>
                      <div className="text-[10px] text-slate-600 font-medium">Estimate Accuracy</div>
                    </div>
                    <div className="bg-slate-900/40 rounded-xl p-3 text-center">
                      <div className="text-[18px] font-bold text-violet-400">{insights.estimates?.avgCompletionHours || 0}h</div>
                      <div className="text-[10px] text-slate-600 font-medium">Avg Completion</div>
                    </div>
                    <div className="bg-slate-900/40 rounded-xl p-3 text-center col-span-2">
                      <div className="text-[18px] font-bold text-amber-400">{insights.estimates?.remainingHours || 0}h</div>
                      <div className="text-[10px] text-slate-600 font-medium">Remaining Estimated Hours</div>
                    </div>
                  </div>
                </div>

                {/* Workload */}
                {insights.distribution?.byAssignee && Object.keys(insights.distribution.byAssignee).length > 0 && (
                  <div className="glass-card rounded-2xl p-4">
                    <h4 className="text-[13px] font-semibold text-slate-300 mb-3">👥 Workload</h4>
                    {Object.entries(insights.distribution.byAssignee).map(([assignee, data]: [string, any]) => (
                      <div key={assignee} className="flex items-center justify-between py-2 border-b border-slate-800/30 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{assignee === 'employee-1' ? '🔩' : assignee === 'yusif' ? '👤' : '❓'}</span>
                          <span className="text-[12px] text-slate-300 font-medium capitalize">{assignee}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="text-emerald-400">{data.done} done</span>
                          <span className="text-violet-400">{data.inProgress} active</span>
                          <span className="text-slate-500">{data.total} total</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
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

        {/* Delete Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-5 animate-fade-in">
            <div className="glass-card rounded-2xl p-6 max-w-sm w-full animate-scale-in">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-2xl mx-auto mb-4">🗑️</div>
              <h3 className="text-lg font-semibold text-white text-center mb-2">Delete Project?</h3>
              <p className="text-[13px] text-slate-400 text-center mb-5">
                This will permanently delete <strong className="text-slate-200">{project.name}</strong> and all its data.
              </p>
              <div className="flex gap-3">
                <button onClick={deleteProject} className="flex-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold py-3 rounded-xl transition-colors text-[13px] border border-rose-500/20 press">Delete</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 font-semibold py-3 rounded-xl transition-colors text-[13px] border border-slate-700/30 press">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showStatusMenu && <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(null)} />}
      </div>

      {/* Real-time update toasts */}
      <EventToasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
