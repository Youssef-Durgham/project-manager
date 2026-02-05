"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ComponentType, COMPONENT_TYPE_LABELS } from "@/lib/types";
import { ProjectTemplate } from "@/models/Template";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

interface NewEnvironment {
  name: string;
  url: string;
  enabled: boolean;
}

interface NewComponent {
  id: string;
  name: string;
  type: ComponentType;
  icon: string;
  environments: NewEnvironment[];
}

const ICONS: Record<ComponentType, string> = {
  mobile: "📱",
  web: "🌐",
  dashboard: "📊",
  backend: "⚙️",
  other: "📦",
};

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [techInput, setTechInput] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [components, setComponents] = useState<NewComponent[]>([]);
  const [showAddComp, setShowAddComp] = useState(false);
  const [compForm, setCompForm] = useState<{ name: string; type: ComponentType; envs: string[] }>({ name: "", type: "mobile", envs: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<ProjectTemplate | null>(null);

  const loadTemplates = async () => {
    if (templates.length > 0) { setShowTemplates(!showTemplates); return; }
    setLoadingTemplates(true);
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setTemplates(data);
      setShowTemplates(true);
    } catch {}
    setLoadingTemplates(false);
  };

  const applyTemplate = (tmpl: ProjectTemplate) => {
    setName(tmpl.name);
    setDescription(tmpl.description);
    setTechStack(tmpl.techStack);
    const newComps: NewComponent[] = tmpl.components.map((c, i) => ({
      id: `comp-tmpl-${Date.now()}-${i}`,
      name: c.name,
      type: c.type,
      icon: c.icon,
      environments: [
        { name: 'dev', url: '', enabled: true },
        { name: 'staging', url: '', enabled: true },
        { name: 'prod', url: '', enabled: true },
      ],
    }));
    setComponents(newComps);
    setShowTemplates(false);
    setPreviewTemplate(null);
  };

  const slug = slugify(name);

  const addTech = () => {
    const t = techInput.trim();
    if (t && !techStack.includes(t)) { setTechStack([...techStack, t]); setTechInput(""); }
  };

  const addComponent = () => {
    if (!compForm.name.trim()) return;
    const newComp: NewComponent = {
      id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: compForm.name.trim(),
      type: compForm.type,
      icon: ICONS[compForm.type],
      environments: compForm.envs.map(e => ({ name: e, url: '', enabled: true })),
    };
    setComponents([...components, newComp]);
    setCompForm({ name: "", type: "mobile", envs: [] });
    setShowAddComp(false);
  };

  const removeComponent = (id: string) => {
    setComponents(components.filter(c => c.id !== id));
  };

  const deriveProjectType = () => {
    const types = new Set(components.map(c => c.type));
    if (types.size === 0) return "fullstack";
    if (types.size === 1) {
      const t = [...types][0];
      if (t === "mobile") return "mobile";
      if (t === "web" || t === "dashboard") return "web";
      if (t === "backend") return "backend";
    }
    return "fullstack";
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Project name is required"); return; }
    setSaving(true); setError("");
    try {
      const projectComponents = components.map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        type: c.type,
        environments: c.environments,
        phases: [],
      }));

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug || `project-${Date.now()}`,
          description: description.trim(),
          type: deriveProjectType(),
          techStack,
          status: "active",
          components: projectComponents,
        }),
      });
      const data = await res.json();
      if (data.success) router.push(`/project/${data.data.slug || data.data._id}`);
      else setError(data.error || "Failed to create project");
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  // Group components by type for display
  const compsByType: Record<string, NewComponent[]> = {};
  components.forEach(c => {
    const label = COMPONENT_TYPE_LABELS[c.type]?.label || c.type;
    if (!compsByType[label]) compsByType[label] = [];
    compsByType[label].push(c);
  });

  return (
    <div className="min-h-screen gradient-mesh noise-bg">
      <div className="max-w-lg lg:max-w-3xl mx-auto px-5 lg:px-8 pt-5 pb-28">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <Link href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-200 transition-colors text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <h2 className="text-[17px] font-bold text-white">New Project</h2>
          <div className="w-12" />
        </div>

        <div className="space-y-6">
          {/* Template Selector */}
          <div className="animate-fade-in">
            <button onClick={loadTemplates}
              className="w-full glass-card rounded-2xl p-4 text-left hover:bg-white/[0.03] transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎨</span>
                  <div>
                    <h3 className="text-[13px] font-semibold text-slate-300 group-hover:text-indigo-300 transition-colors">Start from Template — ابدأ من قالب</h3>
                    <p className="text-[11px] text-slate-600">Pre-built project structures to save time</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {loadingTemplates && <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
                  <svg className={`w-4 h-4 text-slate-600 transition-transform ${showTemplates ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </button>
            {showTemplates && (
              <div className="mt-2 space-y-2 animate-fade-in">
                {/* Template Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {templates.map(tmpl => (
                    <button key={tmpl.id} onClick={() => setPreviewTemplate(previewTemplate?.id === tmpl.id ? null : tmpl)}
                      className={`glass-card rounded-xl p-3 text-left transition-all group ${
                        previewTemplate?.id === tmpl.id
                          ? 'border-indigo-500/40 bg-indigo-500/5'
                          : 'hover:bg-indigo-500/5 hover:border-indigo-500/20'
                      }`}>
                      <div className="text-2xl mb-2">{tmpl.icon}</div>
                      <h4 className="text-[12px] font-semibold text-slate-300 group-hover:text-indigo-300">{tmpl.name}</h4>
                      <p className="text-[9px] text-slate-500 mt-0.5">{tmpl.nameAr}</p>
                      <p className="text-[10px] text-slate-600 mt-1 line-clamp-2">{tmpl.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tmpl.techStack.slice(0, 3).map(t => (
                          <span key={t} className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-500">{t}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Or start blank */}
                <div className="text-center py-2">
                  <button onClick={() => { setShowTemplates(false); setPreviewTemplate(null); }}
                    className="text-[11px] text-slate-500 hover:text-slate-300 font-medium transition-colors">
                    or start blank — أو ابدأ من الصفر
                  </button>
                </div>

                {/* Template Preview */}
                {previewTemplate && (
                  <div className="glass-card rounded-xl p-4 animate-scale-in">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[13px] font-bold text-white">
                        {previewTemplate.icon} {previewTemplate.name}
                      </h4>
                      <button onClick={() => applyTemplate(previewTemplate)}
                        className="text-[11px] px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-500/30 font-semibold hover:bg-indigo-500/30 transition-all press">
                        Use Template — استخدام
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-3">{previewTemplate.description}</p>

                    {/* Components Preview */}
                    <div className="space-y-2">
                      {previewTemplate.components.map((comp, ci) => (
                        <div key={ci} className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/20">
                          <div className="text-[11px] font-semibold text-slate-300 mb-1.5">{comp.icon} {comp.name}</div>
                          {comp.phases.map((phase, pi) => (
                            <div key={pi} className="mb-1.5">
                              <div className="text-[10px] font-medium text-slate-500">{phase.name}</div>
                              <div className="text-[9px] text-slate-600 ml-3">
                                {phase.tasks.length} task{phase.tasks.length !== 1 ? 's' : ''}: {phase.tasks.map(t => t.title).slice(0, 3).join(', ')}{phase.tasks.length > 3 ? '...' : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Tech Stack */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {previewTemplate.techStack.map(t => (
                        <span key={t} className="text-[9px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/15">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Name */}
          <div className="animate-fade-in" style={{ animationDelay: '0.05s' }}>
            <label className="block text-[12px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">Project Name</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="My Awesome App"
              className="w-full bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-3.5 text-[15px] text-white placeholder-slate-600 input-focus"
              autoFocus
            />
            {slug && <p className="text-[10px] text-slate-600 mt-1.5 font-mono">/{slug}</p>}
          </div>

          {/* Description */}
          <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <label className="block text-[12px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
              className="w-full bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-3.5 text-[14px] text-white placeholder-slate-600 input-focus resize-none"
            />
          </div>

          {/* Tech Stack */}
          <div className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <label className="block text-[12px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">Tech Stack</label>
            <div className="flex gap-2">
              <input
                type="text" value={techInput} onChange={e => setTechInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTech(); } }}
                placeholder="React, Node.js, MongoDB..."
                className="flex-1 bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-2.5 text-[13px] text-white placeholder-slate-600 input-focus"
              />
              <button onClick={addTech}
                className="px-4 py-2.5 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 text-[12px] font-semibold rounded-xl transition-all border border-slate-700/30 press">
                Add
              </button>
            </div>
            {techStack.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {techStack.map(tech => (
                  <span key={tech} className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 font-medium border border-indigo-500/15">
                    {tech}
                    <button onClick={() => setTechStack(techStack.filter(t => t !== tech))}
                      className="text-indigo-400/50 hover:text-rose-400 transition-colors text-[13px] leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Components */}
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <label className="block text-[12px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Components
              <span className="text-slate-600 normal-case font-normal ml-2">— backends, mobile apps, websites, dashboards</span>
            </label>

            {/* Added Components */}
            {components.length > 0 && (
              <div className="space-y-2 mb-3">
                {components.map((comp, i) => (
                  <div key={comp.id} className="glass-card rounded-xl px-4 py-3 flex items-center justify-between group animate-scale-in">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-800/80 border border-slate-700/30 flex items-center justify-center text-lg">
                        {comp.icon}
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-slate-200">{comp.name}</div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {COMPONENT_TYPE_LABELS[comp.type]?.label}
                          {comp.environments.length > 0 && (
                            <span className="ml-1.5 text-slate-600">· {comp.environments.map(e => e.name).join(', ')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeComponent(comp.id)}
                      className="w-7 h-7 rounded-lg bg-slate-800/60 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-all text-[14px] opacity-0 group-hover:opacity-100">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Component Form */}
            {showAddComp ? (
              <div className="glass-card rounded-xl p-4 animate-scale-in">
                {/* Type Selection */}
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {(Object.keys(COMPONENT_TYPE_LABELS) as ComponentType[]).map(t => (
                    <button key={t} onClick={() => setCompForm({ ...compForm, type: t })}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-lg text-[10px] font-semibold transition-all ${
                        compForm.type === t
                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          : "bg-slate-800/40 text-slate-500 border border-transparent hover:text-slate-300"
                      }`}>
                      <span className="text-lg">{ICONS[t]}</span>
                      {COMPONENT_TYPE_LABELS[t].label.split(' ')[0]}
                    </button>
                  ))}
                </div>

                {/* Name Input */}
                <input
                  type="text" value={compForm.name}
                  onChange={e => setCompForm({ ...compForm, name: e.target.value })}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addComponent(); } }}
                  placeholder={`e.g. ${compForm.type === 'mobile' ? 'تطبيق الطلاب' : compForm.type === 'backend' ? 'Backend API' : compForm.type === 'dashboard' ? 'لوحة التحكم' : compForm.type === 'web' ? 'الموقع الرسمي' : 'Component name'}`}
                  className="w-full bg-slate-900/60 border border-slate-700/30 rounded-lg px-3 py-2.5 text-[13px] text-slate-200 placeholder-slate-600 input-focus mb-3"
                  autoFocus
                />

                {/* Environments */}
                <div className="mb-3">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Environments</label>
                  <div className="flex flex-wrap gap-2">
                    {['dev', 'test', 'staging', 'prod'].map(env => {
                      const selected = compForm.envs.includes(env);
                      return (
                        <button key={env} type="button"
                          onClick={() => setCompForm({
                            ...compForm,
                            envs: selected ? compForm.envs.filter(e => e !== env) : [...compForm.envs, env]
                          })}
                          className={`text-[10px] px-3 py-1.5 rounded-lg font-semibold uppercase tracking-wider transition-all press ${
                            selected
                              ? env === 'prod' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                env === 'dev' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                env === 'test' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                              : 'bg-slate-800/40 text-slate-600 border border-slate-700/20 hover:text-slate-400'
                          }`}>
                          {selected ? '✓ ' : ''}{env}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={addComponent}
                    className="flex-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[12px] font-semibold py-2.5 rounded-lg transition-colors border border-indigo-500/20 press">
                    Add Component
                  </button>
                  <button onClick={() => { setShowAddComp(false); setCompForm({ name: "", type: "mobile", envs: [] }); }}
                    className="px-4 py-2.5 text-[12px] text-slate-500 hover:text-slate-300 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddComp(true)}
                className="w-full py-3 text-[12px] text-slate-500 hover:text-indigo-400 border border-dashed border-slate-700/40 hover:border-indigo-500/30 rounded-xl transition-all font-medium press">
                + Add Component
              </button>
            )}

            {/* Components Summary */}
            {components.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(compsByType).map(([type, comps]) => (
                  <span key={type} className="text-[10px] px-2 py-1 rounded-md bg-slate-800/60 text-slate-400 border border-slate-700/20 font-medium">
                    {comps.length}× {type}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="text-[13px] text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 animate-scale-in">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="pt-2 animate-fade-in" style={{ animationDelay: '0.25s' }}>
            <button onClick={handleSubmit} disabled={saving || !name.trim()}
              className={`w-full py-4 text-[14px] font-bold rounded-xl transition-all press ${
                name.trim()
                  ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30"
                  : "bg-slate-800/40 text-slate-700 border border-slate-700/20 cursor-not-allowed"
              } ${saving ? "opacity-60" : ""}`}>
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Creating...
                </span>
              ) : "Create Project"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
