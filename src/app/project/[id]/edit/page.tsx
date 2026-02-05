"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Project, ProjectType, ProjectStatus } from "@/lib/types";

const PROJECT_TYPES: { value: ProjectType; icon: string; label: string }[] = [
  { value: "mobile", icon: "📱", label: "Mobile" },
  { value: "web", icon: "🌐", label: "Web" },
  { value: "backend", icon: "⚙️", label: "Backend" },
  { value: "fullstack", icon: "🔄", label: "Full-Stack" },
];

const PROJECT_STATUSES: { value: ProjectStatus; label: string; color: string }[] = [
  { value: "active", label: "Active", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { value: "paused", label: "Paused", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { value: "completed", label: "Completed", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
];

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ProjectType>("web");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techInput, setTechInput] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [githubSaving, setGithubSaving] = useState(false);
  const [githubSaved, setGithubSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((res) => res.json())
      .then((result) => {
        const data = result.data || result;
        setProject(data);
        setName(data.name);
        setDescription(data.description);
        setType(data.type);
        setStatus(data.status);
        setTechStack(data.techStack);
        setGithubRepo(data.githubRepo || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const addTech = () => {
    const trimmed = techInput.trim();
    if (trimmed && !techStack.includes(trimmed)) {
      setTechStack([...techStack, trimmed]);
      setTechInput("");
    }
  };

  const removeTech = (tech: string) => {
    setTechStack(techStack.filter((t) => t !== tech));
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);

    const res = await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim(),
        type,
        status,
        techStack,
      }),
    });

    if (res.ok) {
      router.push(`/project/${id}`);
    } else {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-5xl mb-4">🚫</div>
        <h2 className="text-lg font-semibold text-slate-300">Project not found</h2>
        <Link href="/" className="mt-4 text-blue-400 text-sm hover:underline">← Back</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg lg:max-w-3xl mx-auto px-4 lg:px-8 pt-4 pb-24">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <Link
          href={`/project/${id}`}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <h1 className="text-lg font-semibold text-slate-100">Edit Project</h1>
        <div className="w-12" />
      </div>

      <div className="space-y-5 animate-fade-in" style={{ animationDelay: "0.05s" }}>
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Project Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
          <div className="flex gap-2">
            {PROJECT_STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                className={`
                  flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-center
                  ${status === s.value ? s.color : "bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800/60"}
                `}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Project Type</label>
          <div className="grid grid-cols-2 gap-2">
            {PROJECT_TYPES.map((pt) => (
              <button
                key={pt.value}
                onClick={() => setType(pt.value)}
                className={`
                  flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all
                  ${type === pt.value
                    ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                    : "bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800/60"}
                `}
              >
                <span className="text-lg">{pt.icon}</span>
                <span>{pt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Tech Stack</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              placeholder="e.g., Next.js"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTech();
                }
              }}
              className="flex-1 bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
            />
            <button
              onClick={addTech}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm font-medium transition-colors"
            >
              Add
            </button>
          </div>
          {techStack.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {techStack.map((tech) => (
                <span
                  key={tech}
                  onClick={() => removeTech(tech)}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-700/60 text-slate-300 cursor-pointer hover:bg-rose-900/30 hover:text-rose-300 transition-colors"
                >
                  {tech}
                  <span className="text-slate-500 hover:text-rose-400">×</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* GitHub Integration */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub Repository
            </span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={githubRepo}
              onChange={(e) => { setGithubRepo(e.target.value); setGithubSaved(false); }}
              placeholder="owner/repo or https://github.com/owner/repo"
              className="flex-1 bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
            />
            <button
              onClick={async () => {
                if (!githubRepo.trim()) return;
                setGithubSaving(true);
                try {
                  const res = await fetch('/api/github/link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId: id, githubRepo }),
                  });
                  if (res.ok) {
                    setGithubSaved(true);
                    setTimeout(() => setGithubSaved(false), 3000);
                  }
                } catch {}
                setGithubSaving(false);
              }}
              disabled={githubSaving}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                githubSaved
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              {githubSaving ? '...' : githubSaved ? '✓ Linked' : 'Link'}
            </button>
          </div>
          {githubRepo && (
            <div className="mt-2 text-[11px] text-slate-500">
              <p>Webhook URL: <code className="text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded">{typeof window !== 'undefined' ? window.location.origin : ''}/api/github/webhook</code></p>
              <p className="mt-1">Add this URL in your GitHub repo → Settings → Webhooks. Select <strong className="text-slate-400">push</strong> and <strong className="text-slate-400">pull_request</strong> events.</p>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || saving}
          className={`
            w-full py-3.5 rounded-xl font-semibold text-sm transition-all
            ${name.trim() && !saving
              ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-[0.98]"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"}
          `}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </div>
  );
}
