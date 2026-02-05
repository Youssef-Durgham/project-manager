import mongoose, { Schema, Document } from 'mongoose';

// Subtask
const SubtaskSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  checked: { type: Boolean, default: false },
});

// Acceptance criteria
const CriteriaSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  checked: { type: Boolean, default: false },
});

// Mockup/Design reference
const MockupSchema = new Schema({
  id: { type: String, required: true },
  url: { type: String, required: true }, // S3 URL or data URL
  mode: { type: String, enum: ['exact', 'inspired'], default: 'exact' },
  notes: { type: String, default: '' },
}, { timestamps: true });

// Task
const TaskSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'ready', 'waiting', 'in-progress', 'review', 'revision', 'approved', 'done'], default: 'waiting' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  dueDate: { type: String, default: '' },
  estimatedHours: { type: Number, default: 0 },
  actualHours: { type: Number, default: 0 },
  tags: [{ type: String }],
  notes: [{ type: String }],
  acceptanceCriteria: [CriteriaSchema],
  subtasks: [SubtaskSchema],
  mockups: [MockupSchema],
  dependencies: [{ type: String }],
  assignee: { type: String, enum: ['yusif', 'employee-1', ''], default: '' },
  githubBranch: { type: String, default: '' },
  githubCommits: [{ type: String }],
  startedAt: { type: Date },
  completedAt: { type: Date },
  reviewedAt: { type: Date },
  reviewNotes: { type: String, default: '' },
  fileAttachments: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, default: '' }, // mime type
    size: { type: Number, default: 0 },
    uploadedBy: { type: String, enum: ['yusif', 'employee-1'], default: 'yusif' },
    uploadedAt: { type: Date, default: Date.now },
  }],
  screenshots: [{ // auto-captured screenshots
    id: { type: String, required: true },
    url: { type: String, required: true },
    caption: { type: String, default: '' },
    capturedAt: { type: Date, default: Date.now },
  }],
  pinned: { type: Boolean, default: false },
  timerActive: { type: Boolean, default: false },
  timerStartedAt: { type: Date },
  totalTimerSeconds: { type: Number, default: 0 }, // accumulated timer
  recurring: {
    enabled: { type: Boolean, default: false },
    frequency: { type: String, enum: ['daily', 'weekly', 'biweekly', 'monthly', ''], default: '' },
    nextDue: { type: Date },
  },
  order: { type: Number, default: 0 },
}, { timestamps: true });

// Environment entry
const EnvironmentEntrySchema = new Schema({
  name: { type: String, required: true }, // e.g. 'dev', 'prod', 'test', 'staging'
  url: { type: String, default: '' },
  enabled: { type: Boolean, default: true },
  database: { type: String, default: '' }, // e.g. 'myapp_dev', 'myapp_prod'
  dbShared: { type: Boolean, default: false }, // true = shared with other environments
  dbSharedWith: [{ type: String }], // e.g. ['staging'] — which envs share this DB
  dbNotes: { type: String, default: '' }, // extra notes like "read replica of prod"
});

// Phase
const PhaseSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  order: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'draft'], default: 'active' },
  tasks: [TaskSchema],
}, { timestamps: true });

// Component
const ComponentSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  icon: { type: String, default: '📦' },
  type: { type: String, enum: ['dashboard', 'mobile', 'web', 'backend', 'other'], default: 'other' },
  environments: [EnvironmentEntrySchema],
  phases: [PhaseSchema],
}, { timestamps: true });

// Project
const ProjectSchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true },
  description: { type: String, default: '' },
  techStack: [{ type: String }],
  type: { type: String, enum: ['mobile', 'web', 'backend', 'fullstack'], default: 'fullstack' },
  status: { type: String, enum: ['active', 'completed', 'paused'], default: 'active' },
  githubRepo: { type: String, default: '' },
  components: [ComponentSchema],
}, { timestamps: true });

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);
