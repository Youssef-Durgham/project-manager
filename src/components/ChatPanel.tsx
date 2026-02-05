'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Comment } from '@/lib/types';

interface ChatPanelProps {
  projectId: string;
  taskId?: string;
  phaseId?: string;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDate(comments: Comment[]) {
  const groups: { date: string; messages: Comment[] }[] = [];
  let cur = '';
  for (const msg of comments) {
    const date = formatDate(msg.createdAt || '');
    if (date !== cur) { cur = date; groups.push({ date, messages: [msg] }); }
    else groups[groups.length - 1].messages.push(msg);
  }
  return groups;
}

export default function ChatPanel({ projectId, taskId, phaseId }: ChatPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchComments = useCallback(async () => {
    try {
      const params = new URLSearchParams({ projectId });
      if (taskId) params.set('taskId', taskId);
      if (phaseId) params.set('phaseId', phaseId);
      const res = await fetch(`/api/comments?${params}`);
      const data = await res.json();
      if (data.success) setComments(data.data);
    } catch (e) { console.error('Failed to fetch comments', e); }
    finally { setLoading(false); }
  }, [projectId, taskId, phaseId]);

  useEffect(() => { fetchComments(); const i = setInterval(fetchComments, 10000); return () => clearInterval(i); }, [fetchComments]);
  useEffect(() => { scrollRef.current && (scrollRef.current.scrollTop = scrollRef.current.scrollHeight); }, [comments]);

  const handleSend = async () => {
    if (!text.trim() && !imageUrl) return;
    setSending(true);
    try {
      const body: any = { projectId, author: 'yusif', text: text.trim(), images: imageUrl ? [imageUrl] : [] };
      if (taskId) body.taskId = taskId;
      if (phaseId) body.phaseId = phaseId;
      const res = await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) { setComments(prev => [...prev, data.data]); setText(''); setImageUrl(null); setImagePreview(null); }
    } catch (e) { console.error('Failed to send', e); }
    finally { setSending(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setUploading(true);
    try {
      const res = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: file.name, contentType: file.type }) });
      const data = await res.json();
      if (data.success && data.uploadUrl) {
        await fetch(data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
        setImageUrl(data.fileUrl);
      } else {
        const dataUrl = await new Promise<string>(r => { const rd = new FileReader(); rd.onload = () => r(rd.result as string); rd.readAsDataURL(file); });
        setImageUrl(dataUrl);
      }
    } catch { setImageUrl(imagePreview); }
    finally { setUploading(false); }
  };

  const dateGroups = groupByDate(comments);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-260px)] min-h-[350px] lg:max-w-4xl">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 py-4 space-y-3">
        {comments.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 animate-float">💬</div>
            <p className="text-[13px] text-slate-400 font-medium">No messages yet</p>
            <p className="text-[11px] text-slate-600 mt-1">Start the conversation about this project</p>
          </div>
        )}

        {dateGroups.map((group, gi) => (
          <div key={gi}>
            <div className="flex items-center justify-center my-4">
              <div className="h-px flex-1 bg-slate-800/50" />
              <span className="text-[10px] text-slate-600 font-medium px-3">{group.date}</span>
              <div className="h-px flex-1 bg-slate-800/50" />
            </div>
            
            <div className="space-y-2">
              {group.messages.map((msg, mi) => {
                const isYusif = msg.author === 'yusif';
                const showAuthor = mi === 0 || group.messages[mi - 1].author !== msg.author;
                
                return (
                  <div key={msg._id || mi} className={`flex ${isYusif ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div className={`max-w-[80%] ${isYusif ? 'items-end' : 'items-start'}`}>
                      {showAuthor && (
                        <div className={`text-[10px] font-semibold mb-1 px-1 ${isYusif ? 'text-right text-indigo-400/70' : 'text-left text-emerald-400/70'}`}>
                          {isYusif ? 'Yusif' : 'Employee-1 🔩'}
                        </div>
                      )}
                      
                      <div className={`
                        rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed relative
                        ${isYusif 
                          ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-br-md shadow-lg shadow-indigo-500/10' 
                          : 'bg-slate-800/60 text-slate-200 rounded-bl-md border border-slate-700/30'
                        }
                      `}>
                        {msg.images?.map((img, ii) => (
                          <img key={ii} src={img} alt="" onClick={() => setExpandedImage(img)}
                            className="rounded-lg max-w-full max-h-44 object-cover cursor-pointer hover:opacity-90 transition-opacity mb-2" />
                        ))}
                        
                        {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
                        
                        <div className={`text-[9px] mt-1 ${isYusif ? 'text-indigo-200/40 text-right' : 'text-slate-600 text-left'}`}>
                          {formatTime(msg.createdAt || '')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="px-2 pb-2">
          <div className="relative inline-block">
            <img src={imagePreview} alt="preview" className="h-16 rounded-lg border border-slate-700/30" />
            <button onClick={() => { setImagePreview(null); setImageUrl(null); }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-700 text-slate-300 rounded-full text-[10px] flex items-center justify-center hover:bg-rose-500 transition-colors">
              ×
            </button>
            {uploading && (
              <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-1 pb-2 pt-3 border-t border-slate-800/30">
        <div className="flex items-end gap-2">
          <button onClick={() => fileRef.current?.click()}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-all border border-slate-700/20">
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

          <div className="flex-1 bg-slate-800/40 border border-slate-700/20 rounded-xl overflow-hidden focus-within:border-indigo-500/30 transition-all focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.05)]">
            <textarea
              value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message..."
              rows={1}
              className="w-full bg-transparent px-3.5 py-2.5 text-[13px] text-slate-200 placeholder-slate-600 resize-none focus:outline-none max-h-28"
              style={{ minHeight: '38px' }}
            />
          </div>

          <button onClick={handleSend} disabled={sending || (!text.trim() && !imageUrl)}
            className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              text.trim() || imageUrl
                ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 press'
                : 'bg-slate-800/40 text-slate-700 border border-slate-700/20'
            } ${sending ? 'opacity-50' : ''}`}>
            {sending ? (
              <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setExpandedImage(null)}>
          <img src={expandedImage} alt="" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl animate-scale-in" />
        </div>
      )}
    </div>
  );
}
