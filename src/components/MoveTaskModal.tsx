"use client";

import { useState } from "react";
import { TaskStatus } from "@/lib/types";
import StatusBadge from "./StatusBadge";

interface MoveTaskModalProps {
  taskTitle: string;
  taskId: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  onConfirm: (data: Record<string, any>) => void;
  onCancel: () => void;
}

// What each status transition requires
const TRANSITION_CONFIG: Record<string, {
  icon: string;
  titleAr: string;
  fields: { key: string; label: string; labelAr: string; type: "text" | "textarea" | "select" | "checkbox"; required?: boolean; placeholder?: string; options?: { value: string; label: string }[] }[];
}> = {
  // → Ready
  "ready": {
    icon: "🔵",
    titleAr: "نقل إلى جاهز",
    fields: [
      { key: "addNote", label: "Notes", labelAr: "ملاحظات (اختياري)", type: "textarea", placeholder: "أي ملاحظات قبل البدء..." },
    ],
  },
  // → In Progress
  "in-progress": {
    icon: "🟣",
    titleAr: "بدء العمل",
    fields: [
      { key: "assignee", label: "Assignee", labelAr: "المسؤول", type: "select", required: true, options: [
        { value: "yusif", label: "👤 Yusif" },
        { value: "employee-1", label: "🔩 Employee-1" },
      ]},
      { key: "estimatedHours", label: "Estimated Hours", labelAr: "الوقت المتوقع (ساعات)", type: "text", placeholder: "مثلاً: 4" },
      { key: "addNote", label: "Notes", labelAr: "ملاحظات البدء", type: "textarea", placeholder: "شنو الخطة؟ شنو تبدأ بيه أول شي..." },
    ],
  },
  // → Review
  "review": {
    icon: "🟠",
    titleAr: "إرسال للمراجعة",
    fields: [
      { key: "reviewNotes", label: "What to Review", labelAr: "شنو يحتاج مراجعة؟", type: "textarea", required: true, placeholder: "وصف التغييرات، الروابط، الملفات..." },
      { key: "actualHours", label: "Actual Hours", labelAr: "الوقت الفعلي (ساعات)", type: "text", placeholder: "كم ساعة شغل؟" },
    ],
  },
  // → Revision (needs feedback)
  "revision": {
    icon: "🔴",
    titleAr: "مطلوب تعديلات",
    fields: [
      { key: "addNote", label: "Revision Notes", labelAr: "ملاحظات التعديل", type: "textarea", required: true, placeholder: "شنو يحتاج يتعدل؟ تفاصيل المشكلة..." },
      { key: "priority", label: "Priority", labelAr: "الأولوية", type: "select", options: [
        { value: "critical", label: "🚨 حرج — Critical" },
        { value: "high", label: "🔴 عالي — High" },
        { value: "medium", label: "🟡 متوسط — Medium" },
        { value: "low", label: "🟢 منخفض — Low" },
      ]},
    ],
  },
  // → Done
  "done": {
    icon: "🟢",
    titleAr: "إتمام المهمة",
    fields: [
      { key: "addNote", label: "Completion Notes", labelAr: "ملاحظات الإنجاز", type: "textarea", placeholder: "ملخص شنو انعمل..." },
      { key: "actualHours", label: "Actual Hours", labelAr: "الوقت الفعلي (ساعات)", type: "text", placeholder: "كم ساعة شغل بالمجموع؟" },
    ],
  },
};

export default function MoveTaskModal({ taskTitle, taskId, fromStatus, toStatus, onConfirm, onCancel }: MoveTaskModalProps) {
  const config = TRANSITION_CONFIG[toStatus] || { icon: "➡️", titleAr: "نقل", fields: [] };
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Set<string>>(new Set());

  const statusColors: Record<string, { color: string; border: string; bg: string }> = { 
    "ready": { color: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-500/10" },
    "waiting": { color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/10" },
    "in-progress": { color: "text-violet-400", border: "border-violet-500/20", bg: "bg-violet-500/10" },
    "review": { color: "text-orange-400", border: "border-orange-500/20", bg: "bg-orange-500/10" },
    "revision": { color: "text-rose-400", border: "border-rose-500/20", bg: "bg-rose-500/10" },
    "approved": { color: "text-cyan-400", border: "border-cyan-500/20", bg: "bg-cyan-500/10" },
    "done": { color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/10" },
  };
  const toCol = statusColors[toStatus] || { color: "text-slate-400", border: "border-slate-500/20", bg: "bg-slate-500/10" };

  const handleSubmit = () => {
    // Validate required fields
    const newErrors = new Set<string>();
    config.fields.forEach(f => {
      if (f.required && !formData[f.key]?.trim()) {
        newErrors.add(f.key);
      }
    });
    if (newErrors.size > 0) {
      setErrors(newErrors);
      return;
    }

    // Build update payload
    const payload: Record<string, any> = { status: toStatus };
    config.fields.forEach(f => {
      const val = formData[f.key]?.trim();
      if (!val) return;

      if (f.key === "addNote") {
        payload.addNote = { text: val, by: "yusif", at: new Date().toISOString() };
      } else if (f.key === "estimatedHours" || f.key === "actualHours") {
        const num = parseFloat(val);
        if (!isNaN(num)) payload[f.key] = num;
      } else {
        payload[f.key] = val;
      }
    });

    onConfirm(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0" onClick={onCancel}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md glass-card rounded-2xl overflow-hidden animate-slide-up sm:animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{config.icon}</span>
            <div>
              <h3 className={`text-[15px] font-bold ${toCol.color}`}>{config.titleAr}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                <StatusBadge status={fromStatus} /> → <StatusBadge status={toStatus} />
              </p>
            </div>
          </div>
          <div className="text-[13px] text-slate-300 font-medium bg-slate-800/40 rounded-lg px-3 py-2">
            {taskTitle}
          </div>
        </div>

        {/* Fields */}
        <div className="px-5 pb-4 space-y-3">
          {config.fields.map(field => (
            <div key={field.key}>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                {field.labelAr}
                {field.required && <span className="text-rose-400 ml-1">*</span>}
              </label>

              {field.type === "textarea" && (
                <textarea
                  value={formData[field.key] || ""}
                  onChange={e => { setFormData({ ...formData, [field.key]: e.target.value }); setErrors(prev => { const n = new Set(prev); n.delete(field.key); return n; }); }}
                  placeholder={field.placeholder}
                  rows={3}
                  className={`w-full bg-slate-900/60 border rounded-xl px-4 py-2.5 text-[13px] text-slate-200 placeholder-slate-600 input-focus resize-none ${
                    errors.has(field.key) ? "border-rose-500/50" : "border-slate-700/30"
                  }`}
                  autoFocus={config.fields[0]?.key === field.key}
                />
              )}

              {field.type === "text" && (
                <input
                  type="text"
                  value={formData[field.key] || ""}
                  onChange={e => { setFormData({ ...formData, [field.key]: e.target.value }); setErrors(prev => { const n = new Set(prev); n.delete(field.key); return n; }); }}
                  placeholder={field.placeholder}
                  className={`w-full bg-slate-900/60 border rounded-xl px-4 py-2.5 text-[13px] text-slate-200 placeholder-slate-600 input-focus ${
                    errors.has(field.key) ? "border-rose-500/50" : "border-slate-700/30"
                  }`}
                  autoFocus={config.fields[0]?.key === field.key}
                />
              )}

              {field.type === "select" && field.options && (
                <div className="flex flex-wrap gap-1.5">
                  {field.options.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setFormData({ ...formData, [field.key]: opt.value }); setErrors(prev => { const n = new Set(prev); n.delete(field.key); return n; }); }}
                      className={`px-3 py-2 text-[12px] rounded-xl border font-medium transition-all ${
                        formData[field.key] === opt.value
                          ? `${toCol.bg} ${toCol.color} ${toCol.border}`
                          : `text-slate-500 border-slate-700/30 hover:text-slate-300 hover:border-slate-600/50 ${errors.has(field.key) ? "border-rose-500/30" : ""}`
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {errors.has(field.key) && (
                <p className="text-[10px] text-rose-400 mt-1 font-medium">⚠ مطلوب</p>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={handleSubmit}
            className={`flex-1 py-3 rounded-xl font-semibold text-[13px] transition-all press ${toCol.bg} ${toCol.color} border ${toCol.border} hover:brightness-125`}
          >
            {config.titleAr} →
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-3 rounded-xl text-[13px] text-slate-500 hover:text-slate-300 font-medium transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
