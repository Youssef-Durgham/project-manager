'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Task, Criteria, PRIORITY_CONFIG, MOCKUP_MODE_LABELS, MockupMode, FileAttachment, Comment } from '@/lib/types';
import StatusBadge from './StatusBadge';
import { useAuth } from '@/lib/AuthContext';

interface TaskDetailProps {
  task: Task;
  projectId: string;
  allTasks: { id: string; title: string; status: string }[];
  onClose: () => void;
  onUpdate: (project: any) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'يومي — Daily',
  weekly: 'أسبوعي — Weekly',
  biweekly: 'كل أسبوعين — Biweekly',
  monthly: 'شهري — Monthly',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(type: string, name: string): string {
  if (type.startsWith('image/')) return '🖼️';
  if (type === 'application/pdf' || name.endsWith('.pdf')) return '📄';
  if (type.includes('spreadsheet') || name.endsWith('.xlsx') || name.endsWith('.csv')) return '📊';
  if (type.includes('document') || name.endsWith('.docx') || name.endsWith('.doc')) return '📝';
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return '📦';
  if (type.includes('video')) return '🎬';
  if (type.includes('audio')) return '🎵';
  return '📎';
}

function highlightMentions(text: string): React.ReactNode[] {
  const parts = text.split(/(@(?:yusif|employee-1))/g);
  return parts.map((part, i) => {
    if (part.match(/^@(?:yusif|employee-1)$/)) {
      return (
        <span key={i} className="bg-indigo-500/20 text-indigo-300 px-1 rounded font-semibold">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function TaskDetail({ task, projectId, allTasks, onClose, onUpdate }: TaskDetailProps) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate || '');
  const [newCriteria, setNewCriteria] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDepPicker, setShowDepPicker] = useState(false);
  const [activeSection, setActiveSection] = useState<'details' | 'mockups' | 'files' | 'comments'>('details');
  const [expandedMockup, setExpandedMockup] = useState<string | null>(null);

  // File upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Recurring state
  const [recurringEnabled, setRecurringEnabled] = useState(task.recurring?.enabled || false);
  const [recurringFrequency, setRecurringFrequency] = useState(task.recurring?.frequency || '');

  const criteria = task.acceptanceCriteria || [];
  const subtasks = task.subtasks || [];
  const mockups = task.mockups || [];
  const deps = task.dependencies || [];
  const attachments = task.fileAttachments || [];
  const checkedCriteria = criteria.filter(c => c.checked).length;
  const checkedSubtasks = subtasks.filter(s => s.checked).length;

  // Load comments for this task
  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/comments?projectId=${projectId}&taskId=${task.id}`);
      const data = await res.json();
      if (data.success) setComments(data.data);
    } catch (e) { console.error('Failed to load comments:', e); }
    finally { setLoadingComments(false); }
  }, [projectId, task.id]);

  useEffect(() => {
    if (activeSection === 'comments') {
      loadComments();
    }
  }, [activeSection, loadComments]);

  // Scroll to bottom when comments change
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const updateTask = async (body: any) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/task/${task.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (res.ok) { const data = await res.json(); onUpdate(data.data || data); }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const toggleCriteria = (criteriaId: string) => updateTask({ toggleCriteria: criteriaId });
  const toggleSubtask = (subtaskId: string) => updateTask({ toggleSubtask: subtaskId });

  const addCriteria = () => {
    if (!newCriteria.trim()) return;
    updateTask({ addCriteria: { id: `crit-${Date.now()}`, text: newCriteria.trim(), checked: false } });
    setNewCriteria('');
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    updateTask({ addSubtask: { id: `sub-${Date.now()}`, title: newSubtask.trim(), checked: false } });
    setNewSubtask('');
  };

  const toggleDependency = (depId: string) => {
    const newDeps = deps.includes(depId) ? deps.filter(d => d !== depId) : [...deps, depId];
    updateTask({ dependencies: newDeps });
  };

  const saveEdits = async () => {
    const recurring = {
      enabled: recurringEnabled,
      frequency: recurringEnabled ? recurringFrequency : '',
      nextDue: recurringEnabled && recurringFrequency ? calculateNextDue(recurringFrequency) : undefined,
    };
    await updateTask({ title, description, priority, dueDate, recurring });
    setEditing(false);
  };

  const calculateNextDue = (freq: string): string => {
    const now = new Date();
    switch (freq) {
      case 'daily': now.setDate(now.getDate() + 1); break;
      case 'weekly': now.setDate(now.getDate() + 7); break;
      case 'biweekly': now.setDate(now.getDate() + 14); break;
      case 'monthly': now.setMonth(now.getMonth() + 1); break;
    }
    return now.toISOString();
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`File too large (${formatFileSize(file.size)}). Max 10MB.`);
      return;
    }

    setUploadError('');
    setUploading(true);
    setUploadProgress(0);

    try {
      // Try S3 presigned URL first
      let fileUrl = '';
      try {
        const presignRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: file.type }),
        });
        const presignData = await presignRes.json();

        if (presignData.success && presignData.uploadUrl) {
          // Upload to S3
          const xhr = new XMLHttpRequest();
          await new Promise<void>((resolve, reject) => {
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
            };
            xhr.onload = () => xhr.status === 200 ? resolve() : reject(new Error('Upload failed'));
            xhr.onerror = () => reject(new Error('Upload failed'));
            xhr.open('PUT', presignData.uploadUrl);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.send(file);
          });
          fileUrl = presignData.fileUrl;
        }
      } catch {
        // S3 not configured, fall through to base64
      }

      // Fallback: base64 data URL
      if (!fileUrl) {
        setUploadProgress(30);
        fileUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onprogress = (e) => {
            if (e.lengthComputable) setUploadProgress(30 + Math.round((e.loaded / e.total) * 60));
          };
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
        setUploadProgress(90);
      }

      // Save attachment to task
      const attachment = {
        id: `att-${Date.now()}`,
        name: file.name,
        url: fileUrl,
        type: file.type,
        size: file.size,
        uploadedBy: user?.username || 'yusif',
        uploadedAt: new Date().toISOString(),
      };

      await updateTask({ addAttachment: attachment });
      setUploadProgress(100);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Delete attachment
  const deleteAttachment = async (attachmentId: string) => {
    await updateTask({ removeAttachment: attachmentId });
  };

  // Submit comment
  const submitComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          taskId: task.id,
          author: user?.username || 'yusif',
          text: commentText.trim(),
          images: [],
        }),
      });
      if (res.ok) {
        setCommentText('');
        await loadComments();
      }
    } catch (e) { console.error('Failed to submit comment:', e); }
    finally { setSubmittingComment(false); }
  };

  const depTasks = deps.map(dId => allTasks.find(t => t.id === dId)).filter(Boolean);

  const sectionTabs = [
    { key: 'details' as const, label: 'Details', icon: '📋' },
    ...(mockups.length > 0 ? [{ key: 'mockups' as const, label: `Mockups (${mockups.length})`, icon: '🎨' }] : []),
    { key: 'files' as const, label: `Files${attachments.length > 0 ? ` (${attachments.length})` : ''}`, icon: '📎' },
    { key: 'comments' as const, label: 'Comments', icon: '💬' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg lg:max-w-3xl max-h-[92vh] bg-[#0c1222] border border-slate-700/40 rounded-t-3xl sm:rounded-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>

        
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-slate-800/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              {editing ? (
                <input value={title} onChange={e => setTitle(e.target.value)}
                  className="text-[17px] font-bold text-white bg-transparent border-b border-indigo-500/50 w-full pb-1 focus:outline-none" />
              ) : (
                <h2 className="text-[17px] font-bold text-white flex items-center gap-2">
                  {task.title}
                  {task.recurring?.enabled && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium" title={`Recurring: ${task.recurring.frequency}`}>
                      🔄 {task.recurring.frequency}
                    </span>
                  )}
                </h2>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <StatusBadge status={task.status} size="md" />
                <span className={`text-[10px] px-2 py-[3px] rounded-md border font-medium ${
                  task.priority === 'critical' ? 'bg-rose-500/10 text-rose-300 border-rose-500/20' :
                  task.priority === 'high' ? 'bg-red-500/10 text-red-300 border-red-500/20' :
                  task.priority === 'medium' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
                  'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                }`}>{PRIORITY_CONFIG[task.priority]?.icon} {task.priority}</span>
                {task.assignee && <span className="text-[10px] px-2 py-[3px] rounded-md bg-slate-800/60 text-slate-400 border border-slate-700/20">👤 {task.assignee}</span>}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {!editing ? (
                <button onClick={() => setEditing(true)} className="text-[11px] text-slate-500 hover:text-slate-300">Edit</button>
              ) : (
                <button onClick={saveEdits} disabled={saving} className="text-[11px] text-indigo-400 font-medium">{saving ? '...' : 'Save'}</button>
              )}
              <button onClick={onClose} className="text-slate-600 hover:text-slate-300 text-lg leading-none">×</button>
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 mt-3 bg-slate-800/30 rounded-lg p-0.5 overflow-x-auto scrollbar-hide">
            {sectionTabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveSection(tab.key)}
                className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all whitespace-nowrap px-2 ${
                  activeSection === tab.key ? 'bg-slate-700/60 text-slate-200' : 'text-slate-500'
                }`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(92vh-140px)] px-5 py-4 space-y-5">
          
          {/* === MOCKUPS SECTION === */}
          {activeSection === 'mockups' && (
            <div className="space-y-3">
              {mockups.map(m => (
                <div key={m.id} className="glass-card rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-2 py-[3px] rounded-md border font-semibold ${
                      m.mode === 'exact' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' : 'bg-violet-500/10 text-violet-300 border-violet-500/20'
                    }`}>{MOCKUP_MODE_LABELS[m.mode].icon} {MOCKUP_MODE_LABELS[m.mode].labelAr}</span>
                  </div>
                  <img src={m.url} alt="mockup" className="rounded-lg w-full max-h-64 object-contain bg-slate-900/50 cursor-pointer" onClick={() => setExpandedMockup(m.url)} />
                  {m.notes && <p className="text-[12px] text-slate-400">{m.notes}</p>}
                </div>
              ))}
            </div>
          )}

          {/* === FILES SECTION === */}
          {activeSection === 'files' && (
            <div className="space-y-4 animate-fade-in">
              {/* Upload Button */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="*/*"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-4 border-2 border-dashed border-slate-700/40 hover:border-indigo-500/30 rounded-xl text-center transition-all group"
                >
                  {uploading ? (
                    <div className="space-y-2">
                      <div className="text-[13px] text-indigo-400 font-medium">Uploading... {uploadProgress}%</div>
                      <div className="mx-auto w-48 h-1.5 rounded-full bg-slate-800/60 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">📤</div>
                      <div className="text-[12px] text-slate-400 group-hover:text-slate-300 font-medium">Upload File — رفع ملف</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">Max 10MB</div>
                    </>
                  )}
                </button>
                {uploadError && (
                  <div className="mt-2 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                    ⚠️ {uploadError}
                  </div>
                )}
              </div>

              {/* File List */}
              {attachments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2 animate-float">📎</div>
                  <p className="text-[12px] text-slate-500">No files attached — لا توجد ملفات</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {attachments.map(att => (
                    <div key={att.id} className="glass-card rounded-xl p-3 flex items-center gap-3 group">
                      {/* Preview / Icon */}
                      <div className="w-10 h-10 rounded-lg bg-slate-800/60 border border-slate-700/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {att.type?.startsWith('image/') ? (
                          <img src={att.url} alt={att.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <span className="text-lg">{getFileIcon(att.type || '', att.name)}</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <a href={att.url} target="_blank" rel="noopener noreferrer"
                          className="text-[12px] font-medium text-slate-300 hover:text-indigo-300 truncate block transition-colors">
                          {att.name}
                        </a>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-600">{formatFileSize(att.size || 0)}</span>
                          <span className="text-[10px] text-slate-700">·</span>
                          <span className="text-[10px] text-slate-600">{att.uploadedBy}</span>
                          {att.uploadedAt && (
                            <>
                              <span className="text-[10px] text-slate-700">·</span>
                              <span className="text-[10px] text-slate-600">
                                {new Date(att.uploadedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={att.url} target="_blank" rel="noopener noreferrer"
                          className="w-7 h-7 rounded-lg bg-slate-800/60 flex items-center justify-center text-slate-400 hover:text-indigo-400 text-[12px] transition-colors"
                          title="Download">
                          ↓
                        </a>
                        <button
                          onClick={() => deleteAttachment(att.id)}
                          className="w-7 h-7 rounded-lg bg-slate-800/60 flex items-center justify-center text-slate-400 hover:text-rose-400 text-[12px] transition-colors"
                          title="Delete">
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === COMMENTS SECTION === */}
          {activeSection === 'comments' && (
            <div className="space-y-4 animate-fade-in">
              {loadingComments ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2 animate-float">💬</div>
                  <p className="text-[12px] text-slate-500">No comments yet — لا توجد تعليقات</p>
                  <p className="text-[10px] text-slate-600 mt-1">Be the first to comment on this task</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.map(comment => (
                    <div key={comment._id} className="flex gap-2.5 animate-fade-in">
                      {/* Avatar */}
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[12px] flex-shrink-0 ${
                        comment.author === 'employee-1'
                          ? 'bg-indigo-500/10 border border-indigo-500/20'
                          : 'bg-blue-500/10 border border-blue-500/20'
                      }`}>
                        {comment.author === 'employee-1' ? '🔩' : '👤'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-semibold text-slate-300">{comment.author}</span>
                          <span className="text-[10px] text-slate-600">
                            {comment.createdAt ? new Date(comment.createdAt).toLocaleString('en', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            }) : ''}
                          </span>
                        </div>
                        <div className="text-[12px] text-slate-400 leading-relaxed break-words">
                          {highlightMentions(comment.text)}
                        </div>
                        {comment.images && comment.images.length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {comment.images.map((img, i) => (
                              <img key={i} src={img} alt="" className="w-20 h-20 rounded-lg object-cover bg-slate-800/40 cursor-pointer"
                                onClick={() => setExpandedMockup(img)} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={commentsEndRef} />
                </div>
              )}

              {/* Comment Input */}
              <div className="glass-card rounded-xl p-3 border-slate-700/40">
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                  placeholder="Write a comment... اكتب تعليق (use @yusif or @employee-1)"
                  rows={2}
                  className="w-full bg-transparent border-none text-[12px] text-slate-300 placeholder-slate-600 resize-none focus:outline-none"
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button onClick={loadComments} className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors" title="Refresh">
                      🔄
                    </button>
                    <span className="text-[10px] text-slate-700">{comments.length} comments</span>
                  </div>
                  <button
                    onClick={submitComment}
                    disabled={!commentText.trim() || submittingComment}
                    className="px-3 py-1.5 text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submittingComment ? '...' : 'Send — إرسال'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* === DETAILS SECTION === */}
          {activeSection === 'details' && (
            <>
              {/* Description */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Description</label>
                {editing ? (
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                    className="w-full bg-slate-800/40 border border-slate-700/30 rounded-lg px-3 py-2 text-[13px] text-slate-200 input-focus resize-none" />
                ) : (
                  <p className="text-[13px] text-slate-400 leading-relaxed">{task.description || 'No description'}</p>
                )}
              </div>

              {editing && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Priority</label>
                    <select value={priority} onChange={e => setPriority(e.target.value as any)}
                      className="w-full bg-slate-800/40 border border-slate-700/30 rounded-lg px-3 py-2 text-[13px] text-slate-200 input-focus">
                      {['low','medium','high','critical'].map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p as keyof typeof PRIORITY_CONFIG]?.icon} {p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Due Date</label>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                      className="w-full bg-slate-800/40 border border-slate-700/30 rounded-lg px-3 py-2 text-[13px] text-slate-200 input-focus" />
                  </div>
                </div>
              )}

              {/* Recurring Settings (edit mode) */}
              {editing && (
                <div className="glass-card rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      🔄 Recurring — مهمة متكررة
                    </label>
                    <button
                      onClick={() => setRecurringEnabled(!recurringEnabled)}
                      className={`w-9 h-5 rounded-full transition-all duration-200 relative ${recurringEnabled ? 'bg-cyan-500' : 'bg-slate-700'}`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all duration-200 ${recurringEnabled ? 'left-[19px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                  {recurringEnabled && (
                    <div className="animate-fade-in">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Frequency — التكرار</label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                          <button
                            key={key}
                            onClick={() => setRecurringFrequency(key)}
                            className={`text-[11px] px-3 py-2 rounded-lg border transition-all font-medium text-left ${
                              recurringFrequency === key
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                : 'text-slate-500 border-slate-700/30 hover:text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Show recurring info (non-edit mode) */}
              {!editing && task.recurring?.enabled && (
                <div className="glass-card rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔄</span>
                    <div>
                      <div className="text-[12px] font-medium text-cyan-400">
                        Recurring: {FREQUENCY_LABELS[task.recurring.frequency || ''] || task.recurring.frequency}
                      </div>
                      {task.recurring.nextDue && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Next due: {new Date(task.recurring.nextDue).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Subtasks */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                  Subtasks {subtasks.length > 0 && <span className={checkedSubtasks === subtasks.length ? 'text-emerald-400' : ''}>{checkedSubtasks}/{subtasks.length}</span>}
                </label>
                {subtasks.map(s => (
                  <button key={s.id} onClick={() => toggleSubtask(s.id)}
                    className="w-full flex items-center gap-2.5 py-1.5 px-3 rounded-lg hover:bg-slate-800/30 transition-colors text-left">
                    <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-[9px] border ${
                      s.checked ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'border-slate-600'
                    }`}>{s.checked ? '✓' : ''}</div>
                    <span className={`text-[12px] ${s.checked ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{s.title}</span>
                  </button>
                ))}
                <div className="flex gap-2 mt-1.5">
                  <input type="text" value={newSubtask} onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSubtask()}
                    placeholder="Add subtask..." className="flex-1 bg-slate-800/30 border border-slate-700/20 rounded-lg px-3 py-1.5 text-[11px] text-slate-300 placeholder-slate-600 input-focus" />
                  <button onClick={addSubtask} disabled={!newSubtask.trim()} className="text-[10px] font-semibold text-indigo-400 disabled:text-slate-700 px-2">Add</button>
                </div>
              </div>

              {/* Acceptance Criteria */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                  Acceptance Criteria {criteria.length > 0 && <span className={checkedCriteria === criteria.length ? 'text-emerald-400' : ''}>{checkedCriteria}/{criteria.length}</span>}
                </label>
                {criteria.map(c => (
                  <button key={c.id} onClick={() => toggleCriteria(c.id)}
                    className="w-full flex items-center gap-2.5 py-1.5 px-3 rounded-lg hover:bg-slate-800/30 transition-colors text-left">
                    <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-[9px] border ${
                      c.checked ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'border-slate-600'
                    }`}>{c.checked ? '✓' : ''}</div>
                    <span className={`text-[12px] ${c.checked ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{c.text}</span>
                  </button>
                ))}
                <div className="flex gap-2 mt-1.5">
                  <input type="text" value={newCriteria} onChange={e => setNewCriteria(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCriteria()}
                    placeholder="Add criteria..." className="flex-1 bg-slate-800/30 border border-slate-700/20 rounded-lg px-3 py-1.5 text-[11px] text-slate-300 placeholder-slate-600 input-focus" />
                  <button onClick={addCriteria} disabled={!newCriteria.trim()} className="text-[10px] font-semibold text-indigo-400 disabled:text-slate-700 px-2">Add</button>
                </div>
              </div>

              {/* Dependencies */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Dependencies {deps.length > 0 && <span>{deps.length}</span>}</label>
                  <button onClick={() => setShowDepPicker(!showDepPicker)} className="text-[10px] text-indigo-400 font-medium">{showDepPicker ? 'Done' : '+ Add'}</button>
                </div>
                {depTasks.map(dep => dep && (
                  <div key={dep.id} className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg bg-slate-800/20 border border-slate-700/20 mb-1">
                    <div className={`w-2 h-2 rounded-full ${dep.status === 'done' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                    <span className={`text-[11px] flex-1 ${dep.status === 'done' ? 'text-slate-500' : 'text-slate-300'}`}>{dep.title}</span>
                    <span className={`text-[9px] ${dep.status === 'done' ? 'text-emerald-400' : 'text-amber-400'}`}>{dep.status}</span>
                    <button onClick={() => toggleDependency(dep.id)} className="text-slate-600 hover:text-rose-400 text-[11px]">×</button>
                  </div>
                ))}
                {showDepPicker && allTasks.filter(t => t.id !== task.id && !deps.includes(t.id)).length > 0 && (
                  <div className="mt-1 max-h-28 overflow-y-auto space-y-0.5 animate-scale-in">
                    {allTasks.filter(t => t.id !== task.id && !deps.includes(t.id)).map(t => (
                      <button key={t.id} onClick={() => toggleDependency(t.id)}
                        className="w-full flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-indigo-500/10 text-left text-[11px] text-slate-400">
                        <span className="text-indigo-400">+</span> {t.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* GitHub Integration */}
              {(task.githubBranch || (task.githubCommits && task.githubCommits.length > 0)) && (
                <div className="glass-card rounded-xl p-3 space-y-2">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                    GitHub
                  </label>
                  {task.githubBranch && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-slate-500">Branch:</span>
                      <code className="px-2 py-0.5 rounded-md bg-slate-800/60 text-indigo-300 font-mono text-[10px] border border-slate-700/30">{task.githubBranch}</code>
                    </div>
                  )}
                  {task.githubCommits && task.githubCommits.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-500 font-medium">{task.githubCommits.length} commit{task.githubCommits.length !== 1 ? 's' : ''} / PR{task.githubCommits.length !== 1 ? 's' : ''}</div>
                      <div className="max-h-32 overflow-y-auto space-y-1 scrollbar-hide">
                        {[...task.githubCommits].reverse().map((commit, i) => {
                          const isPR = commit.startsWith('PR #');
                          const prUrlMatch = commit.match(/(https:\/\/github\.com\/[^\s]+)/);
                          return (
                            <div key={i} className={`text-[10px] px-2 py-1.5 rounded-md border ${isPR ? 'bg-violet-500/5 border-violet-500/15 text-violet-300' : 'bg-slate-800/30 border-slate-700/20 text-slate-400'}`}>
                              {isPR && prUrlMatch ? (
                                <a href={prUrlMatch[1]} target="_blank" rel="noopener noreferrer" className="hover:text-violet-200 transition-colors">
                                  {commit.replace(prUrlMatch[1], '').replace(' — ', '').trim()} ↗
                                </a>
                              ) : (
                                <span className="font-mono">{commit}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Expanded mockup / image */}
      {expandedMockup && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={() => setExpandedMockup(null)}>
          <img src={expandedMockup} alt="" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}
