export type ProjectType = "mobile" | "web" | "backend" | "fullstack";
export type ProjectStatus = "active" | "completed" | "paused";
export type TaskStatus = "draft" | "ready" | "waiting" | "in-progress" | "review" | "revision" | "approved" | "done";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type ComponentType = "dashboard" | "mobile" | "web" | "backend" | "other";
export type MockupMode = "exact" | "inspired";

export interface Subtask {
  id: string;
  title: string;
  checked: boolean;
}

export interface Criteria {
  id: string;
  text: string;
  checked: boolean;
}

export interface Mockup {
  id: string;
  url: string;
  mode: MockupMode;
  notes: string;
  createdAt?: string;
}

export interface Environment {
  name: string; // 'dev', 'prod', 'test', 'staging', etc.
  url: string;
  enabled: boolean;
  database?: string; // e.g. 'myapp_dev', 'myapp_prod'
  dbShared?: boolean; // true = shared DB with other environments
  dbSharedWith?: string[]; // which envs share this DB, e.g. ['staging']
  dbNotes?: string; // extra context like "read replica of prod"
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  notes: string[];
  acceptanceCriteria: Criteria[];
  subtasks: Subtask[];
  mockups: Mockup[];
  dependencies: string[];
  assignee?: 'yusif' | 'employee-1' | '';
  githubBranch?: string;
  githubCommits?: string[];
  startedAt?: string;
  completedAt?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  fileAttachments?: FileAttachment[];
  screenshots?: Screenshot[];
  pinned?: boolean;
  timerActive?: boolean;
  timerStartedAt?: string;
  totalTimerSeconds?: number;
  recurring?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | '';
    nextDue?: string;
  };
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: string; // mime type
  size: number;
  uploadedBy: 'yusif' | 'employee-1';
  uploadedAt?: string;
}

export interface Screenshot {
  id: string;
  url: string;
  caption: string;
  capturedAt?: string;
}

export interface Blocker {
  _id?: string;
  projectId: string;
  taskId?: string;
  author: 'yusif' | 'employee-1';
  type: 'blocker' | 'question' | 'decision-needed';
  title: string;
  description: string;
  status: 'open' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'critical';
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Decision {
  _id?: string;
  projectId: string;
  title: string;
  description: string;
  reasoning: string;
  alternatives: string[];
  madeBy: 'yusif' | 'employee-1' | 'both';
  category: 'architecture' | 'tech-stack' | 'design' | 'process' | 'business' | 'other';
  impact: 'low' | 'medium' | 'high';
  status: 'proposed' | 'accepted' | 'superseded' | 'deprecated';
  relatedTaskIds: string[];
  supersededBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CostEntry {
  _id?: string;
  projectId: string;
  category: 'aws' | 'api' | 'hosting' | 'domain' | 'database' | 'storage' | 'ai' | 'other';
  service: string;
  amount: number;
  currency: string;
  period: 'one-time' | 'monthly' | 'yearly' | 'per-use';
  startDate?: string;
  endDate?: string;
  notes: string;
  isEstimate: boolean;
  addedBy: 'yusif' | 'employee-1' | 'system';
  createdAt?: string;
}

export interface Phase {
  id: string;
  name: string;
  description: string;
  order: number;
  status?: 'active' | 'draft';
  tasks: Task[];
}

export interface Component {
  id: string;
  name: string;
  icon: string;
  type: ComponentType;
  environments?: Environment[];
  phases: Phase[];
}

export interface Project {
  _id?: string;
  name: string;
  slug: string;
  description: string;
  techStack: string[];
  type: ProjectType;
  components: Component[];
  status: ProjectStatus;
  githubRepo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Comment {
  _id?: string;
  projectId: string;
  phaseId?: string;
  taskId?: string;
  author: 'yusif' | 'employee-1';
  text: string;
  images: string[];
  createdAt?: string;
}

export interface Activity {
  _id?: string;
  projectId: string;
  actor: 'yusif' | 'employee-1' | 'system';
  action: string;
  targetType: string;
  targetId: string;
  targetName: string;
  details: string;
  metadata: Record<string, any>;
  createdAt?: string;
}

export interface Sprint {
  _id?: string;
  name: string;
  projectId: string;
  startDate: string;
  endDate: string;
  taskIds: string[];
  goals: string[];
  status: 'planning' | 'active' | 'completed';
}

export const TYPE_LABELS: Record<ProjectType, { icon: string; label: string }> = {
  mobile: { icon: "📱", label: "Mobile" },
  web: { icon: "🌐", label: "Web" },
  backend: { icon: "⚙️", label: "Backend" },
  fullstack: { icon: "🔄", label: "Full-Stack" },
};

export const COMPONENT_TYPE_LABELS: Record<ComponentType, { icon: string; label: string }> = {
  dashboard: { icon: "📊", label: "Dashboard" },
  mobile: { icon: "📱", label: "Mobile App" },
  web: { icon: "🌐", label: "Website" },
  backend: { icon: "⚙️", label: "Backend" },
  other: { icon: "📦", label: "Other" },
};

export const STATUS_CONFIG: Record<TaskStatus, { icon: string; label: string; labelAr: string; color: string }> = {
  draft: { icon: "📝", label: "Draft", labelAr: "مسودة", color: "#475569" },
  ready: { icon: "📋", label: "Ready", labelAr: "جاهز", color: "#3b82f6" },
  waiting: { icon: "⏳", label: "Waiting", labelAr: "انتظار", color: "#f59e0b" },
  "in-progress": { icon: "🔄", label: "In Progress", labelAr: "قيد التنفيذ", color: "#8b5cf6" },
  review: { icon: "👁️", label: "In Review", labelAr: "مراجعة", color: "#f97316" },
  revision: { icon: "✏️", label: "Needs Revision", labelAr: "يحتاج تعديل", color: "#ef4444" },
  approved: { icon: "👍", label: "Approved", labelAr: "معتمد", color: "#06b6d4" },
  done: { icon: "✅", label: "Done", labelAr: "مكتمل", color: "#10b981" },
};

export const PRIORITY_CONFIG: Record<TaskPriority, { icon: string; label: string; color: string }> = {
  low: { icon: "🟢", label: "Low", color: "#10b981" },
  medium: { icon: "🟡", label: "Medium", color: "#f59e0b" },
  high: { icon: "🔴", label: "High", color: "#ef4444" },
  critical: { icon: "🚨", label: "Critical", color: "#dc2626" },
};

export const MOCKUP_MODE_LABELS: Record<MockupMode, { icon: string; label: string; labelAr: string }> = {
  exact: { icon: "📐", label: "Exact Copy", labelAr: "نسخة طبق الأصل" },
  inspired: { icon: "🎨", label: "Inspired By", labelAr: "مستوحى من" },
};
